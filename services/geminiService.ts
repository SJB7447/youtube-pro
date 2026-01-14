
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AnalysisResult, ScriptOutline, ProductionPlan, AIConcept } from "../types";

/**
 * 모든 호출에 공통적으로 사용되는 API 클라이언트 생성 함수
 * localStorage에 저장된 키를 우선적으로 사용합니다.
 */
const getAIClient = () => {
  const savedKey = localStorage.getItem('GEMINI_API_KEY');
  const apiKey = savedKey || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API 키가 설정되지 않았습니다. 설정 메뉴에서 키를 입력해주세요.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateConceptAngles = async (topic: string, language: string = "Korean"): Promise<AIConcept[]> => {
  const ai = getAIClient();
  const prompt = `You are a viral YouTube content strategist. The user wants to make a video about "${topic}".
  Generate 4 unique creative angles for this video targeted at the ${language} speaking market.
  
  IMPORTANT: 
  1. "title" and "description" MUST be in ${language}.
  2. "koreanTitle" and "koreanDescription" MUST be in Korean (translated version for the user).
  3. Respond as JSON in the following format:
  
  {
    "concepts": [
      {
        "id": "unique-id",
        "title": "Title in ${language}",
        "description": "Description in ${language}",
        "koreanTitle": "한국어 제목 번역",
        "koreanDescription": "한국어 내용 번역",
        "style": "Visual style in ${language}",
        "targetAudience": "Target audience in ${language}",
        "estimatedVirality": 85
      }
    ]
  }`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          concepts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                koreanTitle: { type: Type.STRING },
                koreanDescription: { type: Type.STRING },
                style: { type: Type.STRING },
                targetAudience: { type: Type.STRING },
                estimatedVirality: { type: Type.NUMBER }
              },
              required: ["id", "title", "description", "koreanTitle", "koreanDescription", "style", "targetAudience", "estimatedVirality"]
            }
          }
        },
        required: ["concepts"]
      }
    }
  });

  const data = JSON.parse(response.text || '{"concepts":[]}');
  return data.concepts;
};

export const analyzeConceptBrief = async (concept: AIConcept): Promise<AnalysisResult> => {
  const ai = getAIClient();
  const prompt = `Analyze this video concept: "${concept.title}" - ${concept.description}.
  1. Predict how an audience would react.
  2. Provide 5 sub-topics/keywords.
  3. Provide SEO strategy for TWO cases: "short" (Shorts/TikTok) and "long" (Standard YouTube).
  4. Each case needs SEO data for both YouTube and TikTok platforms.
  Short SEO: Focus on hooks and trends. Long SEO: Focus on search intent and authority.
  Respond in the same language as the concept title as JSON.`;

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
          },
          seoData: {
            type: Type.OBJECT,
            properties: {
              short: {
                type: Type.OBJECT,
                properties: {
                  youtube: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, tags: { type: Type.ARRAY, items: { type: Type.STRING } } } },
                  tiktok: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, caption: { type: Type.STRING }, hashtags: { type: Type.ARRAY, items: { type: Type.STRING } } } }
                }
              },
              long: {
                type: Type.OBJECT,
                properties: {
                  youtube: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, tags: { type: Type.ARRAY, items: { type: Type.STRING } } } },
                  tiktok: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, caption: { type: Type.STRING }, hashtags: { type: Type.ARRAY, items: { type: Type.STRING } } } }
                }
              }
            },
            required: ["short", "long"]
          }
        },
        required: ["audienceReaction", "frequentKeywords", "recommendedTopics", "seoData"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

export const regenerateSubTopics = async (conceptTitle: string, insight: string): Promise<AnalysisResult['recommendedTopics']> => {
  const ai = getAIClient();
  const prompt = `Based on this video concept: "${conceptTitle}" and strategic insight: "${insight}", provide 5 DIFFERENT and UNIQUE sub-topics/keywords for content creation. 
  Respond in the same language as the concept title as JSON.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
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
        required: ["recommendedTopics"]
      }
    }
  });

  const data = JSON.parse(response.text || '{"recommendedTopics":[]}');
  return data.recommendedTopics;
};

export const generateSeoStrategy = async (title: string, reaction: string, language: string): Promise<AnalysisResult['seoData']> => {
  const ai = getAIClient();
  const prompt = `Based on video title: "${title}" and audience insight: "${reaction}", generate a viral SEO strategy in ${language}.
  Provide SEO data for TWO cases: "short" (Shorts/TikTok) and "long" (Standard YouTube).
  Respond as JSON.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          short: {
            type: Type.OBJECT,
            properties: {
              youtube: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, tags: { type: Type.ARRAY, items: { type: Type.STRING } } } },
              tiktok: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, caption: { type: Type.STRING }, hashtags: { type: Type.ARRAY, items: { type: Type.STRING } } } }
            }
          },
          long: {
            type: Type.OBJECT,
            properties: {
              youtube: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, tags: { type: Type.ARRAY, items: { type: Type.STRING } } } },
              tiktok: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, caption: { type: Type.STRING }, hashtags: { type: Type.ARRAY, items: { type: Type.STRING } } } }
            }
          }
        },
        required: ["short", "long"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

export const generateScriptOutline = async (topic: string): Promise<ScriptOutline> => {
  const ai = getAIClient();
  const prompt = `Create a YouTube script outline for the topic: "${topic}". Respond in the same language as the topic as JSON.`;

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
};

export const generateProductionPlan = async (
  outline: ScriptOutline, 
  isShorts: boolean, 
  visualStyle: string, 
  imageCount: number,
  language: string = "Korean"
): Promise<ProductionPlan> => {
  const ai = getAIClient();
  
  const videoDuration = isShorts ? "20-40 seconds" : "180-270 seconds";

  const prompt = `Video Title: ${outline.title}. 
  Visual Style: ${visualStyle}.
  Target Language: ${language}.
  Task: 
  1. Write a full narrative script in ${language} (duration ${videoDuration}).
  2. Create exactly ${imageCount} detailed visual scene descriptions in English for AI generation.
  3. Provide subtitles following the SRT structure in ${language}.
  Return as JSON.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          fullScript: { type: Type.STRING },
          imagePrompts: { type: Type.ARRAY, items: { type: Type.STRING } },
          subtitles: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                index: { type: Type.INTEGER },
                start: { type: Type.STRING },
                end: { type: Type.STRING },
                text: { type: Type.STRING }
              },
              required: ["index", "start", "end", "text"]
            }
          }
        },
        required: ["fullScript", "imagePrompts", "subtitles"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

export const generateImage = async (prompt: string, aspectRatio: string = "16:9"): Promise<string> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: `High-quality Production visual, absolutely no text: ${prompt}` }] },
    config: { imageConfig: { aspectRatio: aspectRatio as any, imageSize: "1K" } },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Image generation failed");
};

export const generateTTS = async (text: string, language: string = "Korean"): Promise<string> => {
  const ai = getAIClient();
  
  let voiceName = 'Kore'; 
  if (language === "English") voiceName = 'Zephyr';
  if (language === "Japanese") voiceName = 'Puck';

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName } },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("TTS generation failed");
  return `data:audio/pcm;base64,${base64Audio}`;
};

export const generateVeoVideo = async (prompt: string, startImageBase64: string, aspectRatio: string = "16:9"): Promise<string> => {
  const ai = getAIClient();
  const veoAspectRatio = (aspectRatio === "9:16" || aspectRatio === "16:9") ? aspectRatio : "16:9";

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    image: {
      imageBytes: startImageBase64.split(',')[1],
      mimeType: 'image/png'
    },
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio: veoAspectRatio }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({operation});
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  // Use the API key from getAIClient for the fetch as well
  const apiKey = localStorage.getItem('GEMINI_API_KEY') || process.env.API_KEY;
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
