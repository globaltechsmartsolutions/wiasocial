export type GrowthRadarPriority = "high" | "medium" | "low";

interface GrowthRadarSignal {
  label: string;
  value: string;
  interpretation: string;
}
interface GrowthRadarRecommendation {
  title: string;
  priority: GrowthRadarPriority;
  why: string;
  action: string;
  expectedImpact: string;
}

interface GrowthRadarExperiment {
  name: string;
  hypothesis: string;
  steps: string[];
  successMetric: string;
}

export interface GrowthRadarReport {
  opportunityScore: number;
  headline: string;
  executiveSummary: string;
  biggestOpportunity: string;
  keySignals: GrowthRadarSignal[];
  recommendations: GrowthRadarRecommendation[];
  experiments: GrowthRadarExperiment[];
  contentPlan: {
    format: string;
    topic: string;
    hook: string;
    cta: string;
  };
  engagementPlay: string;
  leadPlay: string;
  riskAlerts: string[];
}
