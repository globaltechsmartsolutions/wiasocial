export type LeadStatus = "new" | "contacted" | "call_booked" | "client";

export type ContentGoal = "followers" | "leads" | "sales";

export type ContentTone = "luxury" | "professional" | "aggressive" | "educational";

export type ContentFormat = "reel" | "carousel" | "stories" | "post";

export type ContentFunnelStage = "awareness" | "consideration" | "conversion";

export type CommercialIntensity = "soft" | "balanced" | "direct";

export type CarouselTemplateId =
  | "myth_busting"
  | "mistake_fix"
  | "checklist"
  | "objection_handler"
  | "case_study"
  | "direct_offer"
  | "educational"
  | "comparison"
  | "before_after";

export interface PremiumContentRoute {
  templateId: CarouselTemplateId;
  templateName: string;
  topicSummary: string;
  intent: string;
  reasoning: string;
  slidePattern: string[];
  visualStyle: string;
}

export interface Lead {
  id: string;
  username: string;
  fullName: string;
  niche: string;
  source: string;
  status: LeadStatus;
  notes: string;
  followUpDate: string | null;
  createdAt: string;
}

export interface PostPerformance {
  id: string;
  title: string;
  type: "reel" | "carousel" | "story" | "post";
  postedAt: string;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  leadsGenerated: number;
}

export interface EngagementTarget {
  id: string;
  username: string;
  niche: string;
  followers: string;
  engagementRate: string;
  reason: string;
  lastEngaged: string | null;
}

export interface FollowUp {
  id: string;
  leadId: string;
  leadUsername: string;
  dueDate: string;
  note: string;
  completed: boolean;
}

export interface GeneratedContent {
  hook: string;
  reelScript: string;
  caption: string;
  cta: string;
  hashtags: string[];
  storySequence: string[];
  dmReplyTemplate: string;
}

export interface PremiumContentStrategy {
  angle: string;
  promise: string;
  audiencePain: string;
  conversionIntent: string;
  recommendedFormat: ContentFormat;
  whyThisWillWork: string;
}

export interface PremiumPrimaryPiece {
  title: string;
  hook: string;
  caption: string;
  cta: string;
  reelScript: string;
  publishingNotes: string;
}

export interface PremiumContentVariant {
  label: string;
  angle: string;
  hook: string;
  caption: string;
  cta: string;
}

export interface PremiumCarouselSlide {
  slide: number;
  type: string;
  headline: string;
  support: string;
  visualCue: string;
}

export interface PremiumStorySlide {
  slide: number;
  type: "hook" | "context" | "proof" | "engagement" | "cta";
  text: string;
  sticker: string;
  cta: string;
}

export interface PremiumVisualDirection {
  template: string;
  mood: string;
  palette: string[];
  coverIdea: string;
  assetPrompts: string[];
}

export interface PremiumQualityReview {
  score: number;
  strengths: string[];
  risks: string[];
  improvements: string[];
}

export interface PremiumGeneratedContent extends GeneratedContent {
  contentRoute: PremiumContentRoute;
  strategy: PremiumContentStrategy;
  primaryPiece: PremiumPrimaryPiece;
  variants: PremiumContentVariant[];
  carousel: PremiumCarouselSlide[];
  stories: PremiumStorySlide[];
  dmFollowUp: string;
  visualDirection: PremiumVisualDirection;
  qualityReview: PremiumQualityReview;
}

export interface ReelScript {
  id: string;
  title: string;
  hook: string;
  script: string;
  duration: string;
  niche: string;
  createdAt: string;
}

export interface StorySet {
  id: string;
  idea: string;
  stories: { slide: number; content: string; type: string }[];
  createdAt: string;
}

export interface UserSettings {
  brandName: string;
  instagramHandle: string;
  niche: string;
  targetAudience: string;
  offer: string;
  defaultTone: ContentTone;
  defaultGoal: ContentGoal;
}

export interface CalendarItem {
  id: string;
  day: string;
  dayLabel: string;
  type: "reel" | "carousel" | "story" | "post";
  title: string;
  hook: string;
  status: "planned" | "posted" | "skipped";
  time: string;
}

export interface ViralFormat {
  id: string;
  name: string;
  description: string;
  structure: string[];
  example: string;
  avgViews: string;
}

export interface ContentSeriesPiece {
  day: number;
  type: "reel" | "carousel" | "story" | "post";
  title: string;
  hook: string;
  description: string;
}
