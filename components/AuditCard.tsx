"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseEventLogs } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useSignMessage,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { ConnectButton } from "./ConnectButton";
import {
  AUDIT_SERVICE_TYPE_ID,
  BASE_CHAIN_ID,
  LEFTCLAW_ABI,
  LEFTCLAW_ADDRESS,
} from "@/lib/contracts";
import {
  CV_SIGN_MESSAGE,
  clearCachedCVSignature,
  fetchHighestCV,
  formatCV,
  getCachedCVSignature,
  setCachedCVSignature,
  useConviction,
} from "@/lib/conviction";

type Step = "idle" | "signing" | "spending" | "posting" | "done";

export function AuditCard() {
  const router = useRouter();
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: BASE_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();
  const { signMessageAsync } = useSignMessage();
  const { account, refresh: refreshConviction } = useConviction(address);

  const [description, setDescription] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [highest, setHighest] = useState<number | null>(null);
  // A spend that succeeded but whose job tx didn't land — retry posts the job
  // without debiting conviction a second time.
  const paidRef = useRef<{ cvAmount: number; desc: string } | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const wrongNetwork = !!address && chainId !== BASE_CHAIN_ID;

  // The audit service — price in USD and the conviction divisor — read live
  // from the LeftClaw contract on Base.
  const { data: serviceType } = useReadContract({
    chainId: BASE_CHAIN_ID,
    address: LEFTCLAW_ADDRESS,
    abi: LEFTCLAW_ABI,
    functionName: "getServiceType",
    args: [BigInt(AUDIT_SERVICE_TYPE_ID)],
  });
  const cvDivisor = serviceType ? Number(serviceType.cvDivisor) : null;
  const priceUsd = serviceType ? Number(serviceType.priceUsd) / 1e6 : null;

  useEffect(() => {
    let cancelled = false;
    const load = () => fetchHighestCV().then(h => { if (!cancelled) setHighest(h); });
    load();
    const t = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Cost = a fixed fraction of the single largest conviction balance in the
  // system — the same pricing oracle leftclaw.services uses.
  const cvCost = highest !== null && cvDivisor ? Math.ceil(highest / cvDivisor) : null;
  const insufficient =
    !!address && account !== null && cvCost !== null && account.balance < cvCost;

  const busy = step !== "idle" && step !== "done";
  const canSubmit =
    !!address && !wrongNetwork && !busy && step !== "done" &&
    cvCost !== null && !insufficient && description.trim().length >= 10;

  async function submit() {
    if (!address || !publicClient || wrongNetwork || cvDivisor === null) return;
    if (description.trim().length < 10) {
      setError("Describe the contract — paste a verified address or the source code (min 10 characters).");
      return;
    }
    setError(null);

    try {
      const desc = description.trim();
      let cvAmount: number;

      if (paidRef.current && paidRef.current.desc === desc) {
        // Already debited on a previous attempt — go straight to posting.
        cvAmount = paidRef.current.cvAmount;
      } else {
        let signature = getCachedCVSignature(address);
        if (!signature) {
          setStep("signing");
          signature = await signMessageAsync({ message: CV_SIGN_MESSAGE });
          setCachedCVSignature(address, signature);
        }

        // Re-quote at pay time — the divisor's base moves as the top balance grows.
        const liveHighest = await fetchHighestCV();
        if (!liveHighest) throw new Error("Couldn't read the conviction price oracle — try again in a moment");
        cvAmount = Math.ceil(liveHighest / cvDivisor);

        setStep("spending");
        const spendRes = await fetch("/api/cv-spend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: address, signature, amount: cvAmount }),
        });
        const spendData = await spendRes.json().catch(() => ({}));
        if (!spendRes.ok || !spendData.success) {
          if (spendRes.status === 401) clearCachedCVSignature(address);
          throw new Error(spendData.error || "Conviction spend failed");
        }
        paidRef.current = { cvAmount, desc };
      }

      setStep("posting");
      const txHash = await writeContractAsync({
        chainId: BASE_CHAIN_ID, address: LEFTCLAW_ADDRESS, abi: LEFTCLAW_ABI,
        functionName: "postJobWithCV",
        args: [BigInt(AUDIT_SERVICE_TYPE_ID), BigInt(cvAmount), desc],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      const events = parseEventLogs({ abi: LEFTCLAW_ABI, logs: receipt.logs, eventName: "JobPosted" });
      const jobId = events.length > 0 ? Number(events[0].args.jobId) : null;
      if (jobId === null) throw new Error("Job posted but couldn't read the job ID — check your wallet activity");

      paidRef.current = null;
      refreshConviction();

      // Kick off LeftClaw's sanitization check so workers pick the job up promptly
      fetch("/api/sanitize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: String(jobId), description: desc }),
      }).catch(() => {});

      setStep("done");
      router.push(`/audit/${jobId}`);
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string };
      let msg = (err.shortMessage || err.message || String(e)).slice(0, 300);
      if (paidRef.current) {
        msg += " — your conviction was already debited; press the button again to file the job without paying twice.";
      }
      setError(msg);
      setStep("idle");
    }
  }

  return (
    <div className="border border-line bg-paper text-ink shadow-xl">
      <div className="border-b border-line bg-paper-dark px-6 py-4 flex items-baseline justify-between">
        <span className="smallcaps text-sm font-semibold text-ink-soft">Engagement Form CV-1</span>
        <span className="font-display text-2xl font-semibold tabular">
          {cvCost !== null ? `${formatCV(cvCost)} CV` : "… CV"}
        </span>
      </div>

      <div className="p-6 space-y-5">
        <div>
          <label className="smallcaps block text-sm font-semibold mb-2 text-ink-soft">
            Subject of engagement
          </label>
          <textarea
            className="w-full h-32 border border-line bg-white px-4 py-3 text-sm font-mono focus:outline-none focus:border-ink resize-y"
            placeholder={"Paste a contract address (verified on Basescan/Etherscan) or the Solidity source.\n\ne.g. 0xAbC… on Base — staking vault, please focus on reentrancy and access control"}
            value={description}
            onChange={e => setDescription(e.target.value)}
            disabled={busy || step === "done"}
          />
        </div>

        <div className="flex justify-between text-sm text-ink-soft">
          <span>
            Fee: <strong className="font-mono tabular">{cvCost !== null ? `${formatCV(cvCost)} CV` : "…"}</strong>
            {priceUsd !== null && <span className="opacity-70"> (cash price ${priceUsd.toFixed(2)})</span>}
          </span>
          <span className="opacity-70">settled from your conviction</span>
        </div>

        {mounted && !address && (
          <div className="flex justify-center py-2">
            <ConnectButton />
          </div>
        )}

        {mounted && wrongNetwork && (
          <button
            onClick={() => switchChain({ chainId: BASE_CHAIN_ID })}
            className="w-full py-3 bg-seal text-paper smallcaps font-semibold hover:opacity-90 transition-opacity"
          >
            Switch to Base network
          </button>
        )}

        {mounted && insufficient && (
          <p className="text-sm text-seal">
            Your spendable conviction ({formatCV(account?.balance ?? 0)} CV) doesn&apos;t cover the fee yet.
            Stake more CLAWD above, or let time do the work — conviction accrues every second.
          </p>
        )}

        {mounted && address && !wrongNetwork && (
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="w-full py-4 bg-ink text-paper smallcaps text-base font-semibold tracking-wider hover:bg-lobster transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {step === "signing" && "Sign the conviction note in your wallet…"}
            {step === "spending" && "Settling from your conviction…"}
            {step === "posting" && "Filing the engagement on-chain…"}
            {step === "done" && "Audit commissioned ✓"}
            {step === "idle" && (cvCost !== null ? `Commission audit — ${formatCV(cvCost)} CV` : "Commission audit")}
          </button>
        )}

        {error && <p className="text-sm text-seal border border-seal/40 bg-seal/5 px-4 py-3">{error}</p>}

        <p className="text-xs text-ink-soft/70 leading-relaxed">
          One signature authorizes the ledger to debit your conviction; a Base
          transaction then files the engagement so an auditor can pick it up.
          Your job — description, stage, and final report — is tracked publicly on-chain.
        </p>
      </div>
    </div>
  );
}
