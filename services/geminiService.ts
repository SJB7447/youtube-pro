
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AnalysisResult, CommentData, ScriptOutline, ProductionPlan, GeneratedAsset } from "../types";

export const getGeminiApiKey = () => {
  return process.env.API_KEY || '';
};

export const analyzeContent = async (
  videoTitle: string,
  comments: CommentData[]
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  const commentText = comments.map(c => `- ${c.text}`).join('\n');
  
  const prompt = `You are a professional YouTube growth strategist. 
  Analyze the comments for the video "${videoTitle}" to find new content ideas.
  
  Comments:
  ${commentText}
  
  Output the following in Korean as JSON:
  1. audienceReaction: A concise summary of how people responded to the video.
  2. frequentKeywords: Top 5 most mentioned keywords in comments.
  3. recommendedTopics: 5 specific keywords/short-phrases for new video topics based on audience interest or gaps in current content, with a short 'reason' for each.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            audienceReaction: { type: Type.STRING },
            frequentKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedTopics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  keyword: { type: Type.STRING },
                  reason: { type: Type.STRING }
                },
                required: ["keyword", "reason"]
              }
            }
          },
          required: ["audienceReaction", "frequentKeywords", "recommendedTopics"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const generateScriptOutline = async (
  keyword: string,
  videoTitle: string
): Promise<ScriptOutline> => {
  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  const prompt = `Based on the trending keyword "${keyword}" from the video "${videoTitle}", create a YouTube script outline (Table of Contents). Respond in Korean as JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  content: { type: Type.STRING }
                },
                required: ["label", "content"]
              }
            }
          },
          required: ["title", "sections"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error: any) {
    console.error("Gemini Outline Error:", error);
    throw error;
  }
};

export const generateProductionPlan = async (
  outline: ScriptOutline,
  isShorts: boolean
): Promise<ProductionPlan> => {
  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  const imgCountRange = isShorts ? "6 to 8" : "12 to 25";
  const prompt = `YouTube Video Title: ${outline.title}. Create a full spoken script in Korean and a series of ${imgCountRange} English image generation prompts visualizing the script. Output as JSON.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          fullScript: { type: Type.STRING },
          imagePrompts: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["fullScript", "imagePrompts"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

export const generateImage = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', // Upgrading for better reliability in production workflow
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "16:9", imageSize: "1K" } },
    });

    if (!response.candidates?.[0]?.content?.parts) {
      throw new Error("No parts in response");
    }

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Image content missing in response");
  } catch (error: any) {
    console.error("Image Gen Error for prompt:", prompt, error);
    throw error;
  }
};

export const generateTTS = async (text: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `읽어주세요: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("TTS failed");
  return `data:audio/pcm;base64,${base64Audio}`;
};

export const generateVeoVideo = async (prompt: string): Promise<string> => {
  const apiKey = getGeminiApiKey();
  const ai = new GoogleGenAI({ apiKey });
  
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: `Cinematic high quality 4k trailer: ${prompt}`,
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({operation: operation});
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video download link missing");

  // Fetch actual video bytes to bypass cross-origin / key issues in UI
  const videoResponse = await fetch(`${downloadLink}&key=${apiKey}`);
  const blob = await videoResponse.blob();
  return URL.createObjectURL(blob);
};

export const decodePCM = async (base64: string): Promise<AudioBuffer> => {
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
  const dataInt16 = new Int16Array(bytes.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
};
