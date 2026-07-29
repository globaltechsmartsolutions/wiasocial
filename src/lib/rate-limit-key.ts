export function userRateLimitKey(scope: string, userId: string): string {
  return `${scope}:${userId}`;
}
