import { NextResponse } from "next/server";
import { respondToAIError } from "@/lib/ai/error-response";
import { enforceUserRateLimit, getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { enforceAIUsage } from "@/lib/ai-usage-guard";
import { buildUserAIContext } from "@/lib/ai-context";
import { isOpenAIConfigured } from "@/lib/openai";
import { runLegacyJsonTask } from "@/lib/ai/legacy-call";
import { getSupabaseForUser } from "@/lib/supabase-admin";
import { readJsonObject } from "@/lib/request-validation";

const REPORT_SYSTEM_PROMPT = `You are an expert marketing analyst creating a monthly performance report for an Instagram growth client. Analyze the user's data and create a comprehensive monthly report that can be shared with clients or used internally.

Rules:
- Be specific with numbers where available
- Highlight wins and progress, even if small
- Be honest about areas for improvement without being negative
- Focus on metrics that matter for business growth (leads, engagement, followers)
- Include an actionable next-month plan
- Return JSON only with this exact shape:
{
  "period": string,
  "executiveSummary": string,
  "growthHighlights": [string],
  "metrics": {
    "followersGained": number,
    "followersGainedLabel": string,
    "leadsGenerated": number,
    "clientsAcquired": number,
    "postsPublished": number,
    "engagementRate": string,
    "topPerformingContent": string
  },
  "leadsPerformance": string,
  "contentStats": string,
  "topAchievements": [string],
  "areasForImprovement": [string],
  "nextMonthPlan": [{ "priority": "high" | "medium" | "low", "action": string, "why": string }],
  "clientMessage": string
}`;

export async function GET(request: Request) {
  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getSupabaseForUser(token);
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { data } = await sb
    .from("monthly_reports")
    .select("*")
    .eq("user_id", user.id)
    .eq("month_key", monthKey)
    .maybeSingle();

  return NextResponse.json({ report: data?.report ?? null, monthKey, createdAt: data?.created_at ?? null });
}

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (err) {
    return respondToAIError(err, "monthly-report");
  }
}

async function handlePost(request: Request) {
  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceUserRateLimit(request, user.id, "monthly-report", 8, 60 * 60 * 1000);
  if (limited) return limited;
  if (!isOpenAIConfigured()) {
    return NextResponse.json({ error: "OpenAI no configurada" }, { status: 503 });
  }

  const parsed = await readJsonObject<{ locale?: string }>(request);
  if (!parsed.ok) return parsed.response;
  const locale = parsed.data.locale ?? "es";

  const ctx = await buildUserAIContext(user.id, token);
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = now.toLocaleString(locale === "es" ? "es-ES" : "en-US", { month: "long", year: "numeric" });

  const usageBlocked = await enforceAIUsage(user.id, token);
  if (usageBlocked) return usageBlocked;

  const report = await runLegacyJsonTask({
    taskId: "monthly-report",
    system: REPORT_SYSTEM_PROMPT,
    instruction:
      "Generate the monthly report for the month named in user_input.monthLabel. Use the available data in app_context to create a comprehensive performance summary.",
    input: { monthLabel },
    context: ctx,
    locale,
  });

  const sb = getSupabaseForUser(token);
  await sb.from("monthly_reports").upsert(
    { user_id: user.id, month_key: monthKey, report, created_at: new Date().toISOString() },
    { onConflict: "user_id,month_key" }
  );

  return NextResponse.json({ report, monthKey, createdAt: new Date().toISOString() });
}
