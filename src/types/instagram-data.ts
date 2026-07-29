interface InstagramFullProfile {
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

interface InstagramInsightMetric {
  name: string;
  period: string;
  value: number;
  title?: string;
  description?: string;
}

interface InstagramMediaComment {
  id: string;
  text: string;
  username: string;
  timestamp: string;
  likeCount: number;
}

interface InstagramMediaItem {
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

interface InstagramStoryItem {
  id: string;
  mediaType: string;
  permalink?: string;
  timestamp: string;
}

interface InstagramAudienceData {
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
