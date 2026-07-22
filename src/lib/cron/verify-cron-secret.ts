export function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export function unauthorizedCronResponse(): Response {
  return new Response("Unauthorized", { status: 401 });
}
