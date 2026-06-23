import { getSupabase } from "@/lib/supabase";
import type { Lead, LeadStatus, PostPerformance, UserSettings } from "@/types";

// ─── Leads ───────────────────────────────────────────
export async function fetchLeads(userId: string): Promise<Lead[]> {
  const { data, error } = await getSupabase()
    .from("leads")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapLead);
}

export async function createLead(userId: string, lead: Omit<Lead, "id" | "createdAt">) {
  const { data, error } = await getSupabase()
    .from("leads")
    .insert({
      user_id: userId,
      username: lead.username,
      full_name: lead.fullName,
      niche: lead.niche,
      source: lead.source,
      status: lead.status,
      notes: lead.notes,
      follow_up_date: lead.followUpDate,
    })
    .select()
    .single();
  if (error) throw error;
  return mapLead(data);
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  const { error } = await getSupabase()
    .from("leads")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

function mapLead(row: Record<string, unknown>): Lead {
  return {
    id: row.id as string,
    username: row.username as string,
    fullName: (row.full_name as string) ?? "",
    niche: (row.niche as string) ?? "",
    source: (row.source as string) ?? "",
    status: row.status as LeadStatus,
    notes: (row.notes as string) ?? "",
    followUpDate: (row.follow_up_date as string) ?? null,
    createdAt: (row.created_at as string).split("T")[0],
  };
}

// ─── Posts ───────────────────────────────────────────
export async function fetchPosts(userId: string): Promise<PostPerformance[]> {
  const { data, error } = await getSupabase()
    .from("post_performance")
    .select("*")
    .eq("user_id", userId)
    .order("posted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapPost);
}

export async function createPost(userId: string, post: Omit<PostPerformance, "id">) {
  const { data, error } = await getSupabase()
    .from("post_performance")
    .insert({
      user_id: userId,
      title: post.title,
      type: post.type,
      posted_at: post.postedAt,
      views: post.views,
      likes: post.likes,
      comments: post.comments,
      saves: post.saves,
      shares: post.shares,
      leads_generated: post.leadsGenerated,
    })
    .select()
    .single();
  if (error) throw error;
  return mapPost(data);
}

function mapPost(row: Record<string, unknown>): PostPerformance {
  return {
    id: row.id as string,
    title: row.title as string,
    type: row.type as PostPerformance["type"],
    postedAt: row.posted_at as string,
    views: row.views as number,
    likes: row.likes as number,
    comments: row.comments as number,
    saves: row.saves as number,
    shares: row.shares as number,
    leadsGenerated: row.leads_generated as number,
  };
}

// ─── Settings ─────────────────────────────────────────
export async function fetchSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await getSupabase()
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  if (!data) return null;
  return {
    brandName: data.brand_name ?? "",
    instagramHandle: data.instagram_handle ?? "",
    niche: data.niche ?? "",
    targetAudience: data.target_audience ?? "",
    offer: data.offer ?? "",
    defaultTone: data.default_tone ?? "professional",
    defaultGoal: data.default_goal ?? "leads",
  };
}

export async function saveSettings(userId: string, settings: UserSettings) {
  const { error } = await getSupabase()
    .from("user_settings")
    .upsert({
      user_id: userId,
      brand_name: settings.brandName,
      instagram_handle: settings.instagramHandle,
      niche: settings.niche,
      target_audience: settings.targetAudience,
      offer: settings.offer,
      default_tone: settings.defaultTone,
      default_goal: settings.defaultGoal,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  if (error) throw error;
}

// ─── Follower snapshots ───────────────────────────────
export async function fetchFollowerSnapshots(userId: string) {
  const { data, error } = await getSupabase()
    .from("follower_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    date: r.recorded_at as string,
    followers: r.followers as number,
    gained: r.gained as number,
    topPost: r.top_post as string | undefined,
  }));
}

export async function logFollowers(userId: string, followers: number, gained: number) {
  const { data, error } = await getSupabase()
    .from("follower_snapshots")
    .insert({
      user_id: userId,
      recorded_at: new Date().toISOString().split("T")[0],
      followers,
      gained,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Calendar ─────────────────────────────────────────
export async function fetchCalendar(userId: string) {
  const { data, error } = await getSupabase()
    .from("calendar_items")
    .select("*")
    .eq("user_id", userId)
    .order("scheduled_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    day: r.scheduled_date as string,
    dayLabel: r.day_label as string,
    type: r.content_type as "reel" | "carousel" | "story" | "post",
    title: r.title as string,
    hook: r.hook as string,
    status: r.status as "planned" | "posted" | "skipped",
    time: (r.scheduled_time as string)?.slice(0, 5) ?? "18:00",
  }));
}

export async function saveCalendarItems(
  userId: string,
  items: { day: string; dayLabel: string; type: string; title: string; hook: string; time: string }[]
) {
  await getSupabase().from("calendar_items").delete().eq("user_id", userId).eq("status", "planned");
  const rows = items.map((i) => ({
    user_id: userId,
    scheduled_date: i.day,
    day_label: i.dayLabel,
    content_type: i.type,
    title: i.title,
    hook: i.hook,
    scheduled_time: i.time,
    status: "planned",
  }));
  const { error } = await getSupabase().from("calendar_items").insert(rows);
  if (error) throw error;
}

export async function markCalendarPosted(id: string) {
  const { error } = await getSupabase()
    .from("calendar_items")
    .update({ status: "posted" })
    .eq("id", id);
  if (error) throw error;
}

// ─── Competitors ────────────────────────────────────────
export async function fetchCompetitors(userId: string) {
  const { data, error } = await getSupabase()
    .from("competitors")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    username: r.username as string,
    followers: r.followers as string,
    niche: r.niche as string,
    topPosts: r.top_posts as { title: string; views: string; format: string; hook: string }[],
    patterns: r.patterns as string[],
  }));
}

export async function saveCompetitor(userId: string, comp: {
  username: string; followers: string; niche: string;
  topPosts: unknown[]; patterns: string[];
}) {
  const { data, error } = await getSupabase()
    .from("competitors")
    .insert({
      user_id: userId,
      username: comp.username,
      followers: comp.followers,
      niche: comp.niche,
      top_posts: comp.topPosts,
      patterns: comp.patterns,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Engagement ─────────────────────────────────────────
export async function fetchEngagementTasks(userId: string, date: string) {
  const { data, error } = await getSupabase()
    .from("engagement_tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("task_date", date);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    username: r.username as string,
    action: r.action as string,
    commentTemplate: r.comment_template as string,
    completed: r.completed as boolean,
  }));
}

export async function saveEngagementTasks(
  userId: string,
  date: string,
  tasks: { username: string; action: string; commentTemplate: string }[]
) {
  await getSupabase().from("engagement_tasks").delete().eq("user_id", userId).eq("task_date", date);
  const rows = tasks.map((t) => ({
    user_id: userId,
    username: t.username,
    action: t.action,
    comment_template: t.commentTemplate,
    task_date: date,
    completed: false,
  }));
  const { error } = await getSupabase().from("engagement_tasks").insert(rows);
  if (error) throw error;
}

export async function toggleEngagementTask(id: string, completed: boolean) {
  const { error } = await getSupabase()
    .from("engagement_tasks")
    .update({ completed })
    .eq("id", id);
  if (error) throw error;
}

export async function fetchEngagementTargets(userId: string) {
  const { data, error } = await getSupabase()
    .from("engagement_targets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    username: r.username as string,
    niche: r.niche as string,
    followers: r.followers as string,
    engagementRate: r.engagement_rate as string,
    reason: r.reason as string,
    lastEngaged: r.last_engaged as string | null,
  }));
}

export async function saveEngagementTargets(userId: string, targets: {
  username: string; niche: string; followers: string;
  engagementRate: string; reason: string;
}[]) {
  const rows = targets.map((t) => ({
    user_id: userId,
    username: t.username,
    niche: t.niche,
    followers: t.followers,
    engagement_rate: t.engagementRate,
    reason: t.reason,
  }));
  const { error } = await getSupabase().from("engagement_targets").insert(rows);
  if (error) throw error;
}

export async function markTargetEngaged(id: string) {
  const { error } = await getSupabase()
    .from("engagement_targets")
    .update({ last_engaged: new Date().toISOString().split("T")[0] })
    .eq("id", id);
  if (error) throw error;
}

// ─── Follow-ups ───────────────────────────────────────
export async function fetchFollowUps(userId: string) {
  const { data, error } = await getSupabase()
    .from("follow_ups")
    .select("*")
    .eq("user_id", userId)
    .eq("completed", false)
    .order("due_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    leadId: r.lead_id as string,
    leadUsername: r.lead_username as string,
    dueDate: r.due_date as string,
    note: r.note as string,
    completed: r.completed as boolean,
  }));
}

// ─── Generated content save ─────────────────────────────
export async function saveGeneratedContent(userId: string, data: Record<string, unknown>) {
  const { error } = await getSupabase().from("generated_content").insert({
    user_id: userId,
    ...data,
  });
  if (error) throw error;
}

// ─── Reel scripts ─────────────────────────────────────
export async function fetchReelScripts(userId: string) {
  const { data, error } = await getSupabase()
    .from("reel_scripts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    hook: r.hook as string,
    script: r.script as string,
    duration: r.duration as string,
    niche: r.niche as string,
    createdAt: (r.created_at as string).split("T")[0],
  }));
}

export async function saveReelScript(userId: string, script: {
  title: string; hook: string; script: string; duration: string; niche: string;
}) {
  const { error } = await getSupabase().from("reel_scripts").insert({
    user_id: userId,
    title: script.title,
    hook: script.hook,
    script: script.script,
    duration: script.duration,
    niche: script.niche,
  });
  if (error) throw error;
}

// ─── Story sets ─────────────────────────────────────────
export async function fetchStorySets(userId: string) {
  const { data, error } = await getSupabase()
    .from("story_sets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    idea: r.idea as string,
    stories: r.stories as { slide: number; content: string; type: string }[],
    createdAt: (r.created_at as string).split("T")[0],
  }));
}

export async function saveStorySet(userId: string, idea: string, stories: unknown[]) {
  const { error } = await getSupabase().from("story_sets").insert({
    user_id: userId,
    idea,
    stories,
  });
  if (error) throw error;
}

// ─── Content series ─────────────────────────────────────
export async function saveContentSeries(userId: string, idea: string, pieces: unknown[]) {
  const { error } = await getSupabase().from("content_series").insert({
    user_id: userId,
    idea,
    pieces,
  });
  if (error) throw error;
}

// ─── Instagram Audit Pro ──────────────────────────────
export async function saveInstagramAudit(
  userId: string,
  payload: {
    instagramUsername: string;
    inputData: unknown;
    scores: unknown;
    aiReport: unknown;
    growthScore: number;
  }
) {
  const { data, error } = await getSupabase()
    .from("instagram_audits")
    .insert({
      user_id: userId,
      instagram_username: payload.instagramUsername,
      input_data: payload.inputData,
      scores: payload.scores,
      ai_report: payload.aiReport,
      growth_score: payload.growthScore,
    })
    .select()
    .single();
  if (error) throw error;
  return mapInstagramAudit(data);
}

export async function fetchInstagramAudits(userId: string) {
  const { data, error } = await getSupabase()
    .from("instagram_audits")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map(mapInstagramAudit);
}

export async function fetchInstagramAuditById(userId: string, id: string) {
  const { data, error } = await getSupabase()
    .from("instagram_audits")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .single();
  if (error) throw error;
  return mapInstagramAudit(data);
}

function mapInstagramAudit(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    instagramUsername: row.instagram_username as string,
    inputData: row.input_data as import("@/types/audit").AuditProfileInput,
    scores: row.scores as import("@/types/audit").AuditScoringResult,
    aiReport: (row.ai_report as import("@/types/audit").AuditAIReport | null) ?? null,
    growthScore: row.growth_score as number,
    createdAt: row.created_at as string,
  };
}
