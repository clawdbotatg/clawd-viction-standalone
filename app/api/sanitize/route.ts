import { NextRequest, NextResponse } from "next/server";
import { LEFTCLAW_APP } from "@/lib/contracts";

/** Proxy to LeftClaw's sanitization check (their route has no CORS headers,
 * so the browser can't call it cross-origin). Kicks the safety review that
 * gates worker pickup. */
export async function POST(req: NextRequest) {
  try {
    const { jobId, description } = await req.json();
    if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

    const res = await fetch(`${LEFTCLAW_APP}/api/job/sanitize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: String(jobId), description }),
    });
    const body = await res.json().catch(() => ({}));
    return NextResponse.json(body, { status: res.status });
  } catch (e) {
    console.error("sanitize proxy error:", e);
    return NextResponse.json({ error: "sanitize proxy failed" }, { status: 502 });
  }
}
