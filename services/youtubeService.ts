
import { YouTubeVideo, CommentData } from '../types';

export const getYouTubeApiKey = () => {
  return localStorage.getItem('YT_API_KEY') || process.env.API_KEY || '';
};

export const searchVideos = async (
  query: string, 
  videoType: 'any' | 'short' | 'long' = 'any'
): Promise<YouTubeVideo[]> => {
  const apiKey = getYouTubeApiKey();
  if (!apiKey) throw new Error("YouTube API 키가 설정되지 않았습니다. 설정에서 입력해주세요.");

  // For YouTube API: 'short' is < 4m, 'long' is > 20m
  const durationParam = videoType === 'any' ? '' : `&videoDuration=${videoType}`;

  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${encodeURIComponent(query)}&type=video${durationParam}&key=${apiKey}`
    );
    const searchData = await searchRes.json();
    
    if (searchData.error) {
      if (searchData.error.code === 400 || searchData.error.code === 401) {
        throw new Error("유효하지 않은 YouTube API 키입니다.");
      }
      throw new Error(searchData.error.message);
    }

    const items = searchData.items || [];
    if (items.length === 0) return [];

    const videoIds = items.map((item: any) => item.id.videoId).join(',');
    const channelIds = [...new Set(items.map((item: any) => item.snippet.channelId))].join(',');

    // Fetch Video Stats
    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${apiKey}`
    );
    const statsData = await statsRes.json();

    // Fetch Channel Stats
    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelIds}&key=${apiKey}`
    );
    const channelData = await channelRes.json();

    const channelMap = new Map();
    (channelData.items || []).forEach((c: any) => {
      channelMap.set(c.id, parseInt(c.statistics.subscriberCount) || 0);
    });

    const statsMap = new Map();
    (statsData.items || []).forEach((v: any) => {
      statsMap.set(v.id, parseInt(v.statistics.viewCount) || 0);
    });

    return items.map((item: any): YouTubeVideo => {
      const vId = item.id.videoId;
      const cId = item.snippet.channelId;
      const viewCount = statsMap.get(vId) || 0;
      const subCount = channelMap.get(cId) || 0;
      const efficiencyRatio = subCount > 0 ? (viewCount / subCount) * 100 : 0;

      return {
        id: vId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.high.url,
        publishedAt: item.snippet.publishedAt,
        channelTitle: item.snippet.channelTitle,
        channelId: cId,
        viewCount,
        subscriberCount: subCount,
        efficiencyRatio
      };
    });
  } catch (error: any) {
    console.error("YouTube API Error:", error);
    throw error;
  }
};

export const getVideoComments = async (videoId: string): Promise<CommentData[]> => {
  const apiKey = getYouTubeApiKey();
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=50&order=relevance&key=${apiKey}`
    );
    const data = await res.json();
    if (data.error) return [];

    return (data.items || []).map((item: any) => ({
      text: item.snippet.topLevelComment.snippet.textDisplay,
      author: item.snippet.topLevelComment.snippet.authorDisplayName,
      likeCount: item.snippet.topLevelComment.snippet.likeCount
    }));
  } catch (error) {
    console.error("Comments Fetch Error:", error);
    return [];
  }
};
