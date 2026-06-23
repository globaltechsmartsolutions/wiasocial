export type ProfilePhotoQuality = "professional" | "unclear" | "casual" | "missing";

export type OfferClarity = "clear" | "vague" | "none";

export interface AuditProfileInput {
  displayName: string;
  username: string;
  profilePhotoQuality: ProfilePhotoQuality;
  bio: string;
  bioLink: string;
  ctaInBio: string;
  hasHighlights: boolean;
  highlightNames: string;
  postsPerWeek: number;
  contentTypes: string[];
  hasAuthorityContent: boolean;
  hasConversionContent: boolean;
  offerClarity: OfferClarity;
  estimatedEngagement: string;
  niche: string;
}

export interface AuditSubscores {
  branding: number;
  bio: number;
  content: number;
  conversion: number;
  authority: number;
  consistency: number;
}

export interface AuditIssue {
  id: string;
  severity: "critical" | "warning" | "info";
  rule: string;
  message: string;
  pointsDeducted: number;
  category: keyof AuditSubscores | "general";
}

export interface AuditScoringResult {
  growthScore: number;
  subscores: AuditSubscores;
  issues: AuditIssue[];
  strengths: string[];
  priorities: string[];
}

export interface AuditAIReport {
  generalDiagnosis: string;
  mainErrors: string[];
  recommendedChanges: string[];
  proposedBio: string;
  profilePhotoRecommendation: string;
  highlightsRecommendation: string;
  contentIdeas: string[];
  reelHooks: string[];
  commercialCTAs: string[];
  sevenDayPlan: string[];
}

export interface InstagramAuditRecord {
  id: string;
  instagramUsername: string;
  inputData: AuditProfileInput;
  scores: AuditScoringResult;
  aiReport: AuditAIReport | null;
  createdAt: string;
}

export const DEMO_AUDIT_INPUT: AuditProfileInput = {
  displayName: "Santi Trading",
  username: "@santitrading",
  profilePhotoQuality: "casual",
  bio: "Trader | Ayudo a personas a invertir",
  bioLink: "",
  ctaInBio: "",
  hasHighlights: false,
  highlightNames: "",
  postsPerWeek: 1,
  contentTypes: ["reel"],
  hasAuthorityContent: false,
  hasConversionContent: false,
  offerClarity: "vague",
  estimatedEngagement: "1.2%",
  niche: "trading",
};
