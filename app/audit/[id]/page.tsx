"use client";

import Link from "next/link";
import { use } from "react";
import { useReadContract } from "wagmi";
import {
  BASE_CHAIN_ID,
  JOB_STATUS,
  LEFTCLAW_ABI,
  LEFTCLAW_ADDRESS,
  LEFTCLAW_APP,
} from "@/lib/contracts";
import { formatCV } from "@/lib/conviction";

function resultLink(cid: string): string | null {
  if (!cid) return null;
  if (cid.startsWith("http")) return cid;
  if (cid.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${cid.slice(7)}`;
  return null;
}

export default function AuditTracker({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const jobId = /^\d+$/.test(id) ? BigInt(id) : null;

  const { data: job, isLoading, isError } = useReadContract({
    chainId: BASE_CHAIN_ID,
    address: LEFTCLAW_ADDRESS,
    abi: LEFTCLAW_ABI,
    functionName: "getJob",
    args: jobId !== null ? [jobId] : undefined,
    query: { refetchInterval: 15_000, enabled: jobId !== null },
  });

  const status = job ? JOB_STATUS[job.status] ?? "Unknown" : null;
  const completed = job?.status === 2;
  const link = job ? resultLink(job.resultCID) : null;
  const paidWithCV = job ? job.paymentMethod === 3 && job.cvAmount > 0n : false;

  return (
    <main className="min-h-screen max-w-3xl mx-auto px-6 py-12">
      <Link href="/" className="smallcaps text-sm text-paper/70 hover:text-paper">
        ← Clawdviction
      </Link>

      <div className="mt-8 border border-line bg-paper text-ink shadow-xl">
        <div className="border-b border-line px-6 py-4 flex items-baseline justify-between">
          <span className="smallcaps text-sm font-semibold text-ink-soft">Engagement No. {id}</span>
          {status && (
            <span
              className={`smallcaps text-sm font-bold ${
                completed ? "text-mint" : job && job.status >= 3 ? "text-seal" : "text-gold"
              }`}
            >
              {status}
            </span>
          )}
        </div>

        <div className="p-6 space-y-6">
          {(isLoading || (!job && !isError && jobId !== null)) && (
            <p className="text-sm text-ink-soft">Reading the LeftClaw contract on Base…</p>
          )}
          {jobId === null && <p className="text-sm text-seal">Invalid job id.</p>}

          {isError && !job && (
            <p className="text-sm text-ink-soft">
              No job found under this number yet. If you just paid, give the block a few seconds —
              this page refreshes itself.
            </p>
          )}

          {job && job.createdAt === 0n && (
            <p className="text-sm text-ink-soft">
              No job found under this number yet. If you just paid, give the block a few seconds.
            </p>
          )}

          {job && job.createdAt > 0n && (
            <>
              <div>
                <p className="smallcaps text-sm font-semibold text-ink-soft mb-1">Subject</p>
                <p className="text-sm font-mono whitespace-pre-wrap break-words bg-paper border border-line px-4 py-3 max-h-48 overflow-y-auto">
                  {job.description}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="smallcaps font-semibold text-ink-soft">Commissioned</p>
                  <p>{new Date(Number(job.createdAt) * 1000).toLocaleString()}</p>
                </div>
                {paidWithCV && (
                  <div>
                    <p className="smallcaps font-semibold text-ink-soft">Consideration</p>
                    <p className="font-mono tabular">{formatCV(job.cvAmount)} CV</p>
                  </div>
                )}
                {job.currentStage && (
                  <div>
                    <p className="smallcaps font-semibold text-ink-soft">Current stage</p>
                    <p className="font-mono">{job.currentStage}</p>
                  </div>
                )}
              </div>

              {completed && (
                <div className="border border-mint/40 bg-mint/5 px-5 py-4 space-y-2">
                  <p className="smallcaps font-bold text-mint">Report delivered</p>
                  {link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block underline font-semibold break-all"
                    >
                      Read your audit report →
                    </a>
                  ) : (
                    job.resultCID && <p className="font-mono text-sm break-all">{job.resultCID}</p>
                  )}
                </div>
              )}

              {!completed && job.status <= 1 && (
                <p className="text-sm text-ink-soft leading-relaxed">
                  An auditor picks this up automatically — most reports land within the hour. This
                  page refreshes itself; the engagement number is your receipt, so feel free to
                  close the tab and come back.
                </p>
              )}

              <p className="text-xs text-ink-soft/70">
                Full job detail &amp; worker chat:{" "}
                <a
                  href={`${LEFTCLAW_APP}/jobs/${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  leftclaw.services/jobs/{id}
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
