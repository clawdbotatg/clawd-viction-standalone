import { NextRequest, NextResponse } from "next/server";

export const config = { matcher: "/audit/:id" };

/** Content negotiation for agents: `Accept: application/json` on the human
 * tracking page serves the JSON job API instead of the SPA shell. Browsers
 * always list text/html in Accept, so they never hit this branch. */
export function middleware(req: NextRequest) {
  const accept = req.headers.get("accept") ?? "";
  if (accept.includes("application/json") && !accept.includes("text/html")) {
    const id = req.nextUrl.pathname.split("/")[2];
    return NextResponse.rewrite(new URL(`/api/jobs/${id}`, req.url));
  }
}
