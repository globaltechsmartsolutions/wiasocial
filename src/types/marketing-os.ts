export interface MonthlyMarketingPlan {
  month: string;
  objective: string;
  positioningDiagnosis: string;
  funnelStrategy: {
    awareness: string;
    authority: string;
    conversion: string;
    retention: string;
  };
  contentPillars: {
    name: string;
    role: string;
    exampleTopics: string[];
  }[];
  weeklyCampaigns: {
    week: number;
    theme: string;
    goal: string;
    content: {
      format: string;
      topic: string;
      hook: string;
      cta: string;
    }[];
    kpis: string[];
  }[];
  offerAngles: string[];
  leadMagnets: string[];
  measurementPlan: {
    metric: string;
    target: string;
    whyItMatters: string;
  }[];
  risks: string[];
}

export interface InstagramFunnelPlan {
  offer: string;
  targetAudience: string;
  funnelGoal: string;
  positioning: string;
  profileConversion: {
    bio: string;
    highlights: string[];
    pinnedPosts: string[];
  };
  leadMagnet: {
    title: string;
    promise: string;
    delivery: string;
  };
  dmKeyword: string;
  contentSequence: {
    stage: "awareness" | "authority" | "trust" | "conversion";
    format: string;
    topic: string;
    hook: string;
    cta: string;
  }[];
  storySequence: {
    slide: number;
    goal: string;
    copy: string;
  }[];
  dmScripts: {
    situation: string;
    message: string;
  }[];
  followUpSequence: {
    day: number;
    objective: string;
    message: string;
  }[];
  callScript: string[];
  successMetrics: string[];
}

export interface MarketingPlanRecord {
  id: string;
  planMonth: string;
  plan: MonthlyMarketingPlan;
  createdAt: string;
  updatedAt: string;
}

export interface FunnelRecord {
  id: string;
  funnel: InstagramFunnelPlan;
  createdAt: string;
  updatedAt: string;
}
