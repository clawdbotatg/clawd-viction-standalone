import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { LARV_APP, LEFTCLAW_APP } from "@/lib/contracts";

/** Debit conviction from larv.ai's ledger on the user's behalf.
 *
 * The user signs the fixed message once; we verify the signature here, then
 * relay the spend. With CV_SPEND_SECRET set (shared with larv.ai) we call
 * larv.ai directly; without it we relay through leftclaw.services' cv-spend
 * route, which holds the secret server-side and does the same verification. */
const CV_SIGN_MESSAGE = "larv.ai CV Spend";

const client = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL?.trim() || "https://mainnet.base.org"),
});

export async function POST(req: NextRequest) {
  try {
    const { wallet, signature, amount } = await req.json();
    if (!wallet || !signature || !amount) {
      return NextResponse.json({ error: "Missing wallet, signature, or amount" }, { status: 400 });
    }
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Verify signature — supports EOAs and EIP-1271 smart wallets
    let valid = false;
    try {
      valid = await client.verifyMessage({
        address: wallet as `0x${string}`,
        message: CV_SIGN_MESSAGE,
        signature: signature as `0x${string}`,
      });
    } catch {
      valid = false;
    }
    if (!valid) {
      return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
    }

    const secret = process.env.CV_SPEND_SECRET;
    const res = secret
      ? await fetch(`${LARV_APP}/api/cv/spend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet, signature, secret, amount }),
        })
      : await fetch(`${LEFTCLAW_APP}/api/cv-spend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet, signature, amount }),
        });

    const text = await res.text();
    let data: { success?: boolean; newBalance?: number; error?: string };
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Conviction ledger returned an invalid response", detail: text.slice(0, 200) },
        { status: 502 },
      );
    }

    if (!res.ok || !data.success) {
      return NextResponse.json(
        { error: data.error || "Conviction spend failed" },
        { status: res.status >= 400 ? res.status : 400 },
      );
    }

    return NextResponse.json({ success: true, newBalance: data.newBalance });
  } catch (e) {
    console.error("cv-spend error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
