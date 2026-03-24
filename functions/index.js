import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import logger from "firebase-functions/logger";
import { youtube } from "@googleapis/youtube";
import { defineString } from "firebase-functions/params";
import { YoutubeTranscript } from "youtube-transcript";

const youtubeApiKey = defineString("YOUTUBE_APIKEY");

setGlobalOptions({
  timeoutSeconds: 300,
  memory: "1GiB",
  region: 'asia-northeast3'
});

function getVideoIdFromUrl(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|\/v\/|embed\/))([^?& \n]+)/);
  return match ? match[1] : null;
}

function intelligentParse(description, transcript) {
    const recipes = [];
    const fullText = `${description || ''}\n${transcript || ''}`;
    // [ ] 나 【 】 로 구분된 섹션을 찾는 로직 (수정된 정규표현식)
    const sectionRegex = new RegExp('(?:\\[|【)([^\\]】]+)(?:\]|】)\\s*([\\s\\S]*?)(?=(?:\\[|【)|$)', 'g');
    let match;
    while ((match = sectionRegex.exec(fullText)) !== null) {
        recipes.push({ title: match[1].trim(), content: match[2].trim() });
    }
    // 만약 구분자가 없더라도 내용이 길면 통째로 반환
    if (recipes.length === 0 && fullText.length > 20) {
        recipes.push({ title: "추출된 레시피 정보", content: fullText.trim() });
    }
    return recipes;
}

export const extractRecipe = onRequest({ cors: true }, async (req, res) => {
    // CORS 강제 허용
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(204).send('');

    try {
        const { url } = req.body;
        const videoId = getVideoIdFromUrl(url);
        if (!videoId) return res.status(400).json({ error: 'URL 주소가 올바르지 않습니다.' });

        const youtubeClient = youtube({ version: 'v3', auth: youtubeApiKey.value() });
        const videoResponse = await youtubeClient.videos.list({
            part: ['snippet'],
            id: [videoId]
        });
        
        const videoItem = videoResponse.data.items?.[0];
        const description = videoItem?.snippet?.description || '';
        const videoTitle = videoItem?.snippet?.title || '';

        // --- 자막 추출 (에러 방어막 강화) ---
        let transcript = '';
        try {
            const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
            // transcriptData가 존재하고 배열인 경우에만 map을 실행합니다.
            if (transcriptData && Array.isArray(transcriptData)) {
                transcript = transcriptData.map(t => t.text).join(' ');
            }
        } catch (e) {
            logger.warn(`자막을 가져올 수 없습니다: ${videoId}`);
        }

        const foundRecipes = intelligentParse(description, transcript);

        if (foundRecipes.length > 0) {
            // 제목이 비어있으면 영상 제목으로 채워줍니다.
            foundRecipes.forEach(r => { if (!r.title) r.title = videoTitle; });
            return res.status(200).json({ recipes: foundRecipes });
        } else {
            return res.status(404).json({ error: '레시피 정보를 찾을 수 없습니다.' });
        }

    } catch (error) {
        logger.error('Error:', error);
        return res.status(500).json({ error: "서버 연결에 실패했습니다." });
    }
});