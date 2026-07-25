import { NextResponse } from "next/server";
import { getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { getMonthlyUsage } from "@/lib/ai-usage";

export async function GET(request: Request) {
  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const usage = await getMonthlyUsage(user.id, token);
  return NextResponse.json(usage);
}
