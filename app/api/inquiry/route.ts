import { Resend } from "resend";
import { OWNER_EMAIL } from "@/lib/siteConfig";

/**
 * POST /api/inquiry — receives a project-inquiry lead from the home-hero form
 * and emails it to the owner via Resend. Intentionally tiny: a single notify
 * email, no database. Reading the request body makes this dynamic (never
 * prerendered); Resend's SDK needs the Node runtime, not edge.
 *
 * Env:
 *   RESEND_API_KEY  (required)  — Resend API key.
 *   INQUIRY_TO      (optional)  — where leads land; defaults to OWNER_EMAIL.
 *   INQUIRY_FROM    (optional)  — verified sender; defaults to Resend's
 *                                 onboarding sender, which delivers to the
 *                                 account owner without domain verification.
 */
export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "Bad request." }, { status: 400 });
  }

  // Honeypot — the `website` field is hidden from humans; bots fill it. Accept
  // silently (don't tip off the bot) but send nothing.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return Response.json({ ok: true });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const brief = typeof body.brief === "string" ? body.brief.trim() : "";

  if (!EMAIL_RE.test(email) || email.length > 200) {
    return Response.json({ ok: false, error: "Enter a valid email." }, { status: 422 });
  }
  if (brief.length > 2000) {
    return Response.json({ ok: false, error: "Message is too long." }, { status: 422 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("inquiry: RESEND_API_KEY is not set");
    return Response.json(
      { ok: false, error: "Inquiry mail isn't configured yet — please email instead." },
      { status: 503 },
    );
  }

  const to = process.env.INQUIRY_TO || OWNER_EMAIL;
  const from = process.env.INQUIRY_FROM || "onboarding@resend.dev";

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: `mikevidal.dev <${from}>`,
      to,
      replyTo: email,
      subject: `New project inquiry — ${email}`,
      text: `New inquiry from the mikevidal.dev hero.\n\nReply-to: ${email}\n\n${brief || "(no message included)"}`,
    });
    if (error) {
      console.error("inquiry: resend returned an error", error);
      return Response.json(
        { ok: false, error: "Couldn't send right now — try email instead." },
        { status: 502 },
      );
    }
  } catch (e) {
    console.error("inquiry: send threw", e);
    return Response.json(
      { ok: false, error: "Couldn't send right now — try email instead." },
      { status: 502 },
    );
  }

  return Response.json({ ok: true });
}
