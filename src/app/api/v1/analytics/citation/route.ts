import {
  isCitationEventPayload,
  persistCitationEvent,
} from "@/lib/services/citation-event-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isCitationEventPayload(body)) {
    return Response.json(
      {
        error:
          "Invalid citation payload. Required: gameId, refCrew, metricType, action.",
      },
      { status: 400 },
    );
  }

  const record = persistCitationEvent(body);
  return Response.json({ ok: true, id: record.id });
}
