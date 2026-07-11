import { NextResponse } from "next/server";
import { BaseError, createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { JOB_STATUS, LEFTCLAW_ABI, LEFTCLAW_ADDRESS, SITE_URL } from "@/lib/contracts";

/** Machine-readable job status for agents — same on-chain state the
 * /audit/<id> page renders, minus the browser. Contract enum → stable slugs. */
const STATUS_SLUG = ["pending", "in_progress", "complete", "declined", "cancelled", "reassigned"] as const;

const POLL_INTERVAL_SECONDS = 30;
const TYPICAL_COMPLETION_SECONDS = 3600; // "most reports land within the hour"

const client = createPublicClient({ chain: base, transport: http("https://mainnet.base.org") });

function reportUrl(cid: string): string | null {
  if (!cid) return null;
  if (cid.startsWith("http")) return cid;
  if (cid.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${cid.slice(7)}`;
  return null;
}

function iso(unixSeconds: bigint): string | null {
  return unixSeconds > 0n ? new Date(Number(unixSeconds) * 1000).toISOString() : null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json(
      { error: "invalid_id", detail: "Job id must be a positive integer." },
      { status: 400 },
    );
  }

  const notFound = () =>
    NextResponse.json(
      {
        error: "not_found",
        detail:
          "No job under this id yet. If you just paid, the transaction may not have landed in a block — retry in ~15 seconds.",
        trackUrl: `${SITE_URL}/audit/${id}`,
      },
      { status: 404, headers: { "Retry-After": "15" } },
    );

  let job;
  try {
    job = await client.readContract({
      address: LEFTCLAW_ADDRESS,
      abi: LEFTCLAW_ABI,
      functionName: "getJob",
      args: [BigInt(id)],
    });
  } catch (e) {
    // getJob reverts (array panic) for ids the contract has never assigned
    if (e instanceof BaseError && /revert/i.test(e.message)) return notFound();
    console.error("jobs route RPC error:", e);
    return NextResponse.json(
      { error: "rpc_unavailable", detail: "Could not read the LeftClaw contract on Base. Retry shortly." },
      { status: 502, headers: { "Retry-After": "15" } },
    );
  }

  if (job.createdAt === 0n) return notFound();

  const slug = STATUS_SLUG[job.status] ?? "unknown";
  const done = job.status >= 2;
  const elapsed = Math.floor(Date.now() / 1000) - Number(job.createdAt);

  return NextResponse.json(
    {
      jobId: Number(job.id),
      status: slug,
      statusLabel: JOB_STATUS[job.status] ?? "Unknown",
      stage: job.currentStage || null,
      description: job.description,
      cvPaid: job.paymentMethod === 3 ? Number(job.cvAmount) : null,
      createdAt: iso(job.createdAt),
      startedAt: iso(job.startedAt),
      completedAt: iso(job.completedAt),
      report: job.resultCID || null,
      reportUrl: reportUrl(job.resultCID),
      ...(done
        ? {}
        : {
            // null once past the typical hour — keep polling, don't trust a fake ETA
            estimatedCompletionSeconds: elapsed < TYPICAL_COMPLETION_SECONDS ? TYPICAL_COMPLETION_SECONDS - elapsed : null,
            pollIntervalSeconds: POLL_INTERVAL_SECONDS,
          }),
      trackUrl: `${SITE_URL}/audit/${id}`,
      contract: { address: LEFTCLAW_ADDRESS, chainId: base.id },
    },
    {
      headers: {
        // Completed jobs are immutable on-chain; pending ones change stage.
        "Cache-Control": done ? "public, max-age=300" : "public, max-age=15",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
