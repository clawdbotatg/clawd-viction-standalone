"use client";

import { useEffect, useRef, useState } from "react";
import { formatEther } from "viem";
import { useAccount, useReadContract } from "wagmi";
import {
  BASE_CHAIN_ID,
  STAKING_ABI,
  STAKING_ADDRESS,
} from "@/lib/contracts";
import { CV_DIVISOR_NUM, formatCV, useConviction } from "@/lib/conviction";
import { useClawdPrice } from "@/lib/prices";

/** Split a ticking figure so every second visibly moves it: show just enough
 * decimals that one second of accrual changes the last digit. */
function tickingParts(v: number, rate: number): { int: string; frac: string } {
  const decimals = rate > 0 ? Math.min(6, Math.max(2, Math.ceil(-Math.log10(rate)))) : 0;
  const [i, f] = v.toFixed(decimals).split(".");
  return { int: Number(i).toLocaleString("en-US"), frac: f ? `.${f}` : "" };
}

/** The statement of account.
 *
 * Predictive ledger display. larv.ai's ledger works like this (read from its
 * source): the DB holds (balance, accrualRate, lastAccruedAt); its API
 * returns the live line `clawdviction = balance + rate × elapsed`; the cron
 * (~5 min) materializes that same line and swaps the rate to the current
 * on-chain totalStaked — so the ledger's value is CONTINUOUS at every cron
 * tick, only its slope changes.
 *
 * We therefore anchor at the API's value once per page load and tick at
 * max(ledger rate, on-chain rate): the chain rate is what the ledger's slope
 * becomes at the next cron, so the extrapolation lands on the ledger's own
 * line — and a fresh stake starts counting the moment it lands instead of
 * waiting out the cron. Background refetches only re-sync along that line;
 * a monotonic clamp guarantees the counter never ticks downward (the one
 * legitimate drop is a real spend, which arrives as totalSpent rising). */
export function ConvictionLedger() {
  const { address } = useAccount();
  const { account, error, refresh } = useConviction(address);
  const clawdPrice = useClawdPrice();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: staked, refetch: refetchStaked } = useReadContract({
    chainId: BASE_CHAIN_ID, address: STAKING_ADDRESS, abi: STAKING_ABI,
    functionName: "totalStaked", args: address ? [address] : undefined,
    query: { refetchInterval: 12_000 },
  });
  // Only consulted when the ledger API is unreachable.
  const { data: chainCV } = useReadContract({
    chainId: BASE_CHAIN_ID, address: STAKING_ADDRESS, abi: STAKING_ABI,
    functionName: "getClawdviction", args: address ? [address] : undefined,
    query: { refetchInterval: 30_000, enabled: !!address && error },
  });

  // The moment a stake/unstake confirms, StakeCard fires this — re-read the
  // chain position and the ledger so the counter reacts instantly.
  useEffect(() => {
    const onStaked = () => {
      refetchStaked();
      refresh();
    };
    window.addEventListener("cv:staked", onStaked);
    return () => window.removeEventListener("cv:staked", onStaked);
  }, [refetchStaked, refresh]);

  // Slope of the prediction: the ledger's stored rate, or the on-chain rate
  // the ledger will switch to at its next cron tick — whichever is higher
  // (after a fresh stake the chain leads; after an unstake the ledger's
  // stale-high rate is what it will actually credit until the cron).
  const chainRatePerSec = staked ? Number(formatEther(staked)) / 1_728_000 : 0;
  const ratePerSec = Math.max(account?.accrualRate ?? 0, chainRatePerSec);
  const perDay = ratePerSec * 86_400;

  const totalSpent = account?.totalSpent ?? 0;

  // The ledger's exact line right now (what the cron will materialize).
  const ledgerLine =
    !error && account
      ? account.clawdviction + account.accrualRate * Math.max(0, (nowMs - account.fetchedAt) / 1000)
      : error && chainCV !== undefined
        ? Number(chainCV) / CV_DIVISOR_NUM
        : null;

  // Glide reconciliation: the displayed figure is its own line — it ticks up
  // at the predicted slope every second, and any excess over the ledger's
  // line decays exponentially (τ = 10 min), so the counter climbs without
  // ever freezing or dropping and converges exactly onto the ledger. The one
  // legitimate drop is a real spend (totalSpent rises), which re-anchors.
  const GLIDE_TAU_S = 600;
  const predRef = useRef<{ address?: string; spent: number; value: number | null; lastMs: number }>({
    spent: 0, value: null, lastMs: 0,
  });
  const pred = predRef.current;
  if (pred.address !== address || totalSpent > pred.spent) {
    predRef.current = { address, spent: totalSpent, value: ledgerLine, lastMs: nowMs };
  } else if (ledgerLine !== null) {
    if (pred.value === null) {
      pred.value = ledgerLine;
      pred.lastMs = nowMs;
    } else if (nowMs > pred.lastMs) {
      const dt = (nowMs - pred.lastMs) / 1000;
      const ticked = pred.value + ratePerSec * dt;
      const gap = Math.max(0, ticked - ledgerLine);
      const next = ledgerLine + gap * Math.exp(-dt / GLIDE_TAU_S);
      // Ride the ledger line when it's ahead; never render a decrease.
      pred.value = Math.max(pred.value, Math.max(ledgerLine, next));
      pred.lastMs = nowMs;
    }
  }
  const headline = predRef.current.value;

  const stakedNum = staked ? Number(formatEther(staked)) : 0;

  if (!mounted) return null;

  return (
    <div className="border border-line bg-paper text-ink shadow-xl">
      <div className="border-b border-line bg-paper-dark px-6 py-4">
        <span className="smallcaps text-sm font-semibold text-ink-soft">Statement of account</span>
      </div>
      <div className="p-6 space-y-6">
        {!address && (
          <p className="text-sm text-ink-soft leading-relaxed">
            Connect a wallet to open your statement. Conviction accrues to the
            address that stakes — every second, at a rate equal to your stake.
          </p>
        )}

        {address && (
          <>
            <div>
              <p className="smallcaps text-sm font-semibold text-ink-soft mb-1">Conviction to your name</p>
              <p className="font-display text-5xl font-semibold tabular leading-tight">
                {headline === null ? (
                  "…"
                ) : (
                  <>
                    {tickingParts(headline, ratePerSec).int}
                    <span className="text-3xl">{tickingParts(headline, ratePerSec).frac}</span>
                  </>
                )}
                <span className="text-2xl text-ink-soft font-normal"> CV</span>
              </p>
              <p className="mt-1 text-sm text-ink-soft tabular">
                {ratePerSec > 0
                  ? <>accruing +{formatCV(perDay)} CV per day</>
                  : <>not accruing — no active stake</>}
              </p>
              {error && (
                <p className="mt-2 text-xs text-ink-soft/70">
                  Ledger unreachable — counting from the chain (spends not deducted).
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm border-t border-line pt-5">
              <div>
                <p className="smallcaps font-semibold text-ink-soft">On deposit</p>
                <p className="font-mono tabular">
                  {stakedNum.toLocaleString("en-US", { maximumFractionDigits: 0 })} CLAWD
                </p>
                {clawdPrice !== null && stakedNum > 0 && (
                  <p className="text-xs text-ink-soft/70 tabular">
                    ≈ ${(stakedNum * clawdPrice).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>
              <div>
                <p className="smallcaps font-semibold text-ink-soft">Spendable now</p>
                <p className="font-mono tabular">{account ? `${formatCV(account.balance)} CV` : "…"}</p>
              </div>
              <div>
                <p className="smallcaps font-semibold text-ink-soft">Lifetime earned</p>
                <p className="font-mono tabular">{account ? `${formatCV(account.totalEarned)} CV` : "…"}</p>
              </div>
              <div>
                <p className="smallcaps font-semibold text-ink-soft">Lifetime spent</p>
                <p className="font-mono tabular">{account ? `${formatCV(account.totalSpent)} CV` : "…"}</p>
              </div>
            </div>

            <p className="text-xs text-ink-soft/70 leading-relaxed">
              Kept by the same ledger{" "}
              <a href="https://larv.ai" className="underline hover:text-gold" target="_blank" rel="noopener noreferrer">
                larv.ai
              </a>{" "}
              uses. The counter starts climbing the moment your deposit lands;
              the spendable balance follows within a few minutes. Unstaking
              banks what you&apos;ve earned, forever.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
