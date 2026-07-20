export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    name: "Ref Watch Data API",
    version: "v1",
    documentation: "https://refwatch.ca/docs/api",
    authentication: {
      header: "x-api-key",
      alternate: "Authorization: Bearer <key>",
    },
    tiers: {
      FREE: { quota: "50 requests / day" },
      DEVELOPER: { quota: "10,000 requests / month" },
      ENTERPRISE: { quota: "custom / unlimited" },
    },
    endpoints: [
      { method: "GET", path: "/api/v1/health" },
      { method: "GET", path: "/api/v1/leagues/{league}/stats" },
      { method: "GET", path: "/api/v1/leagues/{league}/refs" },
    ],
  });
}
