import { NextResponse } from "next/server";
import { getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { openai, isOpenAIConfigured } from "@/lib/openai";
import type { ContentGoal, ContentTone } from "@/types";

export async function POST(request: Request) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Add OPENAI_API_KEY to .env.local" },
      { status: 503 }
    );
  }

  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { niche, audience, offer, goal, tone } = body as {
    niche: string;
    audience: string;
    offer: string;
    goal: ContentGoal;
    tone: ContentTone;
  };

  const prompt = `You are an expert Instagram content strategist. Generate viral content for:
- Niche: ${niche}
- Target Audience: ${audience}
- Offer: ${offer}
- Goal: ${goal}
- Tone: ${tone}

Return a JSON object with these fields:
- hook: attention-grabbing opening line
- reelScript: full reel script with timestamps
- caption: Instagram caption with line breaks
- cta: clear call to action
- hashtags: array of 8-10 relevant hashtags
- storySequence: array of 5 story slide texts
- dmReplyTemplate: template for replying to engaged users

Only return valid JSON, no markdown.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    return NextResponse.json({ error: "No content generated" }, { status: 500 });
  }

  return NextResponse.json(JSON.parse(content));
}
