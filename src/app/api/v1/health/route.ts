export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    status: "ok",
    service: "refwatch-api-v1",
    timestamp: new Date().toISOString(),
  });
}
