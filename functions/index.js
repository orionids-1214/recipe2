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

// --- Helper Functions (수정된 안전한 버전) ---
function getVideoIdFromUrl(url) {
  if (!url) return null;
  // 정규표현식을 더 간결하고 안전하게 수정했습니다.
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|\/v\/|embed\/))([^?& \n]+)/);
  return match ? match[1] : null;
}

function intelligentParse(description, transcript, comments) {
    const recipes = [];
    const fullText = `${description}\n${transcript}\n${comments}`;
    const sectionRegex = /(?:\[|【)([^\]】]+)(?:\]|】)\\s*([\\s\\S]*?)(?=(?:\[|【)|$)/g;
    let match;
    while ((match = sectionRegex.exec(fullText)) !== null) {
        recipes.push({ title: match[1].trim(), content: match[2].trim() });
    }
    if (recipes.length === 0 && fullText.length > 100) {
        recipes.push({ title: "추출된 레시피", content: fullText.substring(0, 2000) });
    }
    return recipes;
}

// --- Main Function ---
export const extractRecipe = onRequest({ cors: true }, async (req, res) => {
    // CORS 설정을 가장 확실하게 강제합니다.
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required.' });
        }

        const videoId = getVideoIdFromUrl(url);
        if (!videoId) {
            return res.status(400).json({ error: 'Invalid YouTube URL.' });
        }

        const youtubeClient = youtube({ version: 'v3', auth: youtubeApiKey.value() });
        
        const videoResponse = await youtubeClient.videos.list({
            part: ['snippet', 'contentDetails'],
            id: [videoId]
        });
        const videoItem = videoResponse.data.items?.[0];
        const videoTitle = videoItem?.snippet?.title || 'Unknown Video';
        const description = videoItem?.snippet?.description || '';

        let transcript = '';
        try {
            const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
            transcript = transcriptData.map(t => t.text).join(' ');
        } catch (e) {
            logger.warn(`No transcript for ${videoId}`);
        }

        const foundRecipes = intelligentParse(description, transcript, '');

        if (foundRecipes.length > 0) {
            foundRecipes.forEach(r => { if (!r.title) r.title = videoTitle; });
            return res.status(200).json({ recipes: foundRecipes });
        } else {
            return res.status(404).json({ error: 'Recipe not found.' });
        }

    } catch (error) {
        logger.error('Error:', error);
        return res.status(500).json({ error: error.message });
    }
});