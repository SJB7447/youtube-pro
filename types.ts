
export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  channelTitle: string;
  channelId: string;
  viewCount: number;
  subscriberCount?: number;
  efficiencyRatio?: number; // (ViewCount / SubscriberCount) * 100
}

export interface AnalysisResult {
  audienceReaction: string;
  frequentKeywords: string[];
  recommendedTopics: {
    keyword: string;
    reason: string;
  }[];
}

export interface ScriptOutline {
  title: string;
  sections: {
    label: string;
    content: string;
  }[];
}

export interface ProductionPlan {
  fullScript: string;
  imagePrompts: string[];
}

export interface GeneratedAsset {
  type: 'image' | 'audio' | 'video';
  url: string;
  prompt?: string;
}

export interface CommentData {
  text: string;
  author: string;
  likeCount: number;
}
