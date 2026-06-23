export interface InstagramFullProfile {
  id: string;
  username: string;
  name?: string;
  biography?: string;
  profilePictureUrl?: string;
  website?: string;
  followersCount: number;
  followsCount: number;
  mediaCount: number;
}

export interface InstagramInsightMetric {
  name: string;
  period: string;
  value: number;
  title?: string;
  description?: string;
}

export interface InstagramMediaComment {
  id: string;
  text: string;
  username: string;
  timestamp: string;
  likeCount: number;
}

export interface InstagramMediaItem {
  instagramMediaId: string;
  mediaType: string;
  caption: string;
  permalink?: string;
  thumbnailUrl?: string;
  postedAt: string;
  likeCount: number;
  commentsCount: number;
  insights: Record<string, number>;
  comments: InstagramMediaComment[];
}

export interface InstagramStoryItem {
  id: string;
  mediaType: string;
  permalink?: string;
  timestamp: string;
}

export interface InstagramAudienceData {
  onlineFollowers?: { hour: number; value: number }[];
  demographics?: Record<string, unknown>;
}

export interface InstagramFullData {
  connected: boolean;
  username?: string;
  profile?: InstagramFullProfile;
  accountInsights?: InstagramInsightMetric[];
  audience?: InstagramAudienceData;
  stories?: InstagramStoryItem[];
  media: InstagramMediaItem[];
  lastSyncedAt?: string;
  stats: {
    totalPosts: number;
    totalComments: number;
    totalLikes: number;
    totalReach: number;
    totalViews: number;
  };
}
