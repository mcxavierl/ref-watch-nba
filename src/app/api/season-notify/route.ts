import {
  parseSeasonNotifyPayload,
  SEASON_NOTIFY_DESTINATION,
} from "@/lib/notify";
import { SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

async function sendViaResend(
  apiKey: string,
  email: string,
  league: "NBA" | "NHL",
): Promise<Response> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Ref Watch <notify@refwatch.ca>",
      to: [SEASON_NOTIFY_DESTINATION],
      subject: `Ref Watch season notify — ${league}`,
      text: [
        `New season-start notification signup on ${SITE_NAME}.`,
        "",
        `Subscriber email: ${email}`,
        `League: ${league}`,
      ].join("\n"),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Resend season notify failed:", res.status, detail);
    return Response.json(
      { error: "Unable to send notification right now." },
      { status: 502 },
    );
  }

  return Response.json({ ok: true });
}

async function sendViaFormSubmit(
  email: string,
  league: "NBA" | "NHL",
): Promise<Response> {
  const res = await fetch(
    `https://formsubmit.co/ajax/${encodeURIComponent(SEASON_NOTIFY_DESTINATION)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email,
        league,
        _subject: `Ref Watch season notify — ${league}`,
        _template: "table",
        _captcha: "false",
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("FormSubmit season notify failed:", res.status, detail);
    return Response.json(
      { error: "Unable to send notification right now." },
      { status: 502 },
    );
  }

  const data = (await res.json().catch(() => null)) as {
    success?: string;
  } | null;

  if (data?.success !== "true") {
    console.error("FormSubmit season notify unexpected response:", data);
    return Response.json(
      { error: "Unable to send notification right now." },
      { status: 502 },
    );
  }

  return Response.json({ ok: true });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const payload = parseSeasonNotifyPayload(body);
  if (!payload) {
    return Response.json(
      { error: "Enter a valid email and league." },
      { status: 400 },
    );
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    return sendViaResend(resendKey, payload.email, payload.league);
  }

  return sendViaFormSubmit(payload.email, payload.league);
}
