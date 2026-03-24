
import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import logger from "firebase-functions/logger";
import { youtube } from "@googleapis/youtube";
import { defineString } from "firebase-functions/params";
import { YoutubeTranscript } from "youtube-transcript";
import cors from "cors";

const youtubeApiKey = defineString("YOUTUBE_APIKEY");

// CORS 미들웨어를 초기화합니다. 모든 도메인에서의 요청을 허용합니다.
const corsMiddleware = cors({ origin: true });

// 모든 함수에 대한 전역 옵션을 설정합니다.
setGlobalOptions({
  timeoutSeconds: 300,
  memory: "1GiB",
  region: 'asia-northeast3'
});

// --- Helper Functions ---

function getVideoIdFromUrl(url) {
  if (!url) return null;
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&? \/]{11})/;
  const match = url.match(youtubeRegex);
  return match ? match[1] : null;
}

function refineText(line) {
    if (!line) return '';
    return line
        .replace(/\[\d{2}:\d{2}\.\d{3}\]/g, '')
        .replace(/\((음악|웃음|박수|광고)\)/g, '')
        .replace(/[\*\•\▶\✔✔︎\-]/g, '')
        .trim();
}

function intelligentParse(description, transcript, commentsText) {
    const allText = [description, transcript, commentsText].join('\n\n');
    if (!allText.trim()) return [];

    const ingredientsKeywords = ['재료', '준비물', 'ingredients', '재료 소개', '성분'];
    const instructionsKeywords = ['만드는 법', '만드는 방법', '조리법', '순서', '만들기', 'instructions', 'directions', 'recipe', '조리 과정'];

    const lines = allText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

    let recipes = [];
    let currentRecipe = { title: '', ingredients: [], instructions: [] };
    let state = 'IDLE';

    const isSectionHeader = (line, keywords) => keywords.some(kw => new RegExp(`^[<【\[]?\s*${kw}\s*[>】\]]?$`, 'i').test(line));
    const isInstructionMarker = (line) => /^(\d+\.|[①-⑩]|[가-힣]\)|STEP)/.test(line);

    for (const line of lines) {
        if (isSectionHeader(line, ingredientsKeywords)) {
            if (currentRecipe.ingredients.length > 0 || currentRecipe.instructions.length > 0) {
                recipes.push(currentRecipe);
            }
            currentRecipe = { title: '', ingredients: [], instructions: [] };
            state = 'IN_INGREDIENTS';
        } else if (isSectionHeader(line, instructionsKeywords)) {
            state = 'IN_INSTRUCTIONS';
        } else {
            if (state === 'IN_INGREDIENTS') {
                const cleanedLine = refineText(line);
                if (cleanedLine) currentRecipe.ingredients.push(cleanedLine);
            } else if (state === 'IN_INSTRUCTIONS') {
                const cleanedLine = refineText(line);
                if (!cleanedLine) continue;

                if (isInstructionMarker(cleanedLine)) {
                    currentRecipe.instructions.push(cleanedLine);
                } else if (currentRecipe.instructions.length > 0) {
                    const last = currentRecipe.instructions.length - 1;
                    currentRecipe.instructions[last] += ' ' + cleanedLine;
                }
            }
        }
    }

    if (currentRecipe.ingredients.length > 0 || currentRecipe.instructions.length > 0) {
        recipes.push(currentRecipe);
    }

    const finalRecipes = recipes.map(recipe => {
        const cleanedInstructions = recipe.instructions.map(inst =>
            inst.replace(/^(\d+\.|[①-⑩]|[가-힣]\)|STEP|\s*-\s*)/, '').trim()
        );

        return {
            ...recipe,
            ingredients: [...new Set(recipe.ingredients)].filter(Boolean),
            instructions: cleanedInstructions.filter(Boolean)
        };
    }).filter(r => r.ingredients.length > 0 && r.instructions.length > 0);

    return finalRecipes;
}


// --- Main Cloud Function ---

// onRequest 핸들러를 cors 미들웨어로 감싸서 모든 요청에 CORS 헤더를 먼저 적용합니다.
export const extractRecipe = onRequest((req, res) => {
    // corsMiddleware를 실행하여 응답 헤더를 설정하고, 다음 로직을 콜백으로 실행합니다.
    corsMiddleware(req, res, async () => {
        // HTTP 메소드가 POST가 아닌 경우, 405 Method Not Allowed 에러를 반환합니다.
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method Not Allowed' });
            return;
        }

        const { url } = req.body;
        // URL 파라미터 유효성 검사
        if (!url || typeof url !== 'string') {
            res.status(400).json({ error: 'A valid URL parameter is required.' });
            return;
        }

        const videoId = getVideoIdFromUrl(url);
        if (!videoId) {
            res.status(400).json({ error: 'Invalid YouTube URL format.' });
            return;
        }

        try {
            // YouTube API 클라이언트 초기화
            const youtubeClient = youtube({ version: 'v3', auth: youtubeApiKey.value() });

            let description = '';
            let videoTitle = '';
            try {
                const videoDetailsResponse = await youtubeClient.videos.list({ part: ['snippet'], id: [videoId] });
                const video = videoDetailsResponse.data.items?.[0];
                if (!video) {
                    res.status(404).json({ error: 'Video not found.' });
                    return;
                }
                videoTitle = video.snippet.title;
                description = video.snippet.description || '';
            } catch (e) {
                logger.error("Error fetching video details:", { error: e.message, videoId });
                res.status(500).json({ error: "Failed to fetch video details from YouTube." });
                return;
            }

            // 자막(Transcript) 추출
            let transcript = '';
            try {
                const trans = await YoutubeTranscript.fetchTranscript(url);
                transcript = trans.map(t => t.text).join('\n');
            } catch (e) {
                logger.warn(`Could not fetch transcript for video ${videoId}.`);
            }

            // 댓글(Comments) 추출
            let commentsText = '';
            try {
                const commentsResponse = await youtubeClient.commentThreads.list({
                    part: ['snippet'],
                    videoId: videoId,
                    order: 'relevance',
                    maxResults: 10
                });
                commentsResponse.data.items?.forEach(item => {
                    const comment = item.snippet?.topLevelComment?.snippet;
                    if(comment){
                        commentsText += comment.textDisplay + '\n';
                    }
                });
            } catch (e) {
                logger.warn(`Could not fetch comments for video ${videoId}.`);
            }

            // 텍스트 분석 및 레시피 파싱
            const foundRecipes = intelligentParse(description, transcript, commentsText);

            // 결과 반환
            if (foundRecipes.length > 0) {
                foundRecipes.forEach(r => { if (!r.title) r.title = videoTitle; });
                res.status(200).json({ recipes: foundRecipes });
            } else {
                res.status(404).json({ error: 'No parseable recipe was found in the video content.' });
            }

        } catch (error) {
            logger.error('Unhandled error in extractRecipe:', { error: error.message, url });
            res.status(500).json({ error: 'An unexpected server error occurred.' });
        }
    });
});
