
export interface AIConcept {
  id: string;
  title: string;
  description: string;
  koreanTitle?: string;
  koreanDescription?: string;
  style: string;
  targetAudience: string;
  estimatedVirality: number; // 0-100
}

export interface SEOContent {
  youtube: {
    title: string;
    description: string;
    tags: string[];
  };
  tiktok: {
    title: string;
    caption: string;
    hashtags: string[];
  };
}

export interface AnalysisResult {
  audienceReaction: string;
  frequentKeywords: string[];
  recommendedTopics: {
    keyword: string;
    reason: string;
  }[];
  seoData: {
    short: SEOContent;
    long: SEOContent;
  };
}

export interface ScriptOutline {
  title: string;
  sections: {
    label: string;
    content: string;
  }[];
}

export interface SubtitleSegment {
  index: number;
  start: string; // HH:MM:SS,mmm
  end: string;   // HH:MM:SS,mmm
  text: string;
}

export interface ProductionPlan {
  fullScript: string;
  imagePrompts: string[];
  subtitles: SubtitleSegment[];
}

export interface GeneratedAsset {
  type: 'image' | 'audio' | 'video';
  url: string;
  prompt?: string;
}

/**
 * Represents metadata for a YouTube video retrieved from the YouTube API
 */
export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  channelTitle: string;
  channelId: string;
  viewCount: number;
  subscriberCount: number;
  efficiencyRatio: number;
}

export interface FavoriteProject {
  id: string;
  video: YouTubeVideo;
  result: AnalysisResult | null;
  scriptOutline: ScriptOutline | null;
  savedAt: number;
}

/**
 * Represents comment data for a YouTube video
 */
export interface CommentData {
  text: string;
  author: string;
  likeCount: number;
}
