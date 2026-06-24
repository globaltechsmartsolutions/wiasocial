export type PotentialFollowerInterestLevel = "high" | "medium" | "low";

export interface PotentialFollowerCandidate {
  username: string | null;
  displayName: string;
  fitScore: number;
  interestLevel: PotentialFollowerInterestLevel;
  sourceType: "manual_public_interaction" | "similar_account" | "hashtag_topic" | "own_audience";
  nicheSignals: string[];
  interactionSignals: string[];
  correlationReason: string;
  sourceHint: string;
  recommendedAction: string;
  openingComment: string;
  dmAngle: string;
}

export interface AudienceSegment {
  name: string;
  whyItFits: string;
  publicSignals: string[];
  whereToFind: string[];
}

export interface AudienceFinderReport {
  niche: string;
  headline: string;
  summary: string;
  confidenceNote: string;
  searchAngles: string[];
  segments: AudienceSegment[];
  candidates: PotentialFollowerCandidate[];
  engagementPlan: string[];
  dmTemplate: string;
  complianceNotes: string[];
}
