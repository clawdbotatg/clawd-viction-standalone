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
 * The headline counter is anchored to the CHAIN: getClawdviction(user) is
 * exact from the second a stake lands, survives reloads, and only ever
 * grows. The larv.ai ledger is fetched per page load for what the chain
 * can't know (spends, pre-v2 history) — its figure is merged as a floor,
 * never as a snap-down: larv.ai's accrual rate updates on a slow cron, so
 * right after staking it undercounts, and trusting it blindly is what made
 * the counter jump backwards and reset on reload. */
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
  const {
    data: chainCV,
    dataUpdatedAt: chainCVAt,
    refetch: refetchChainCV,
  } = useReadContract({
    chainId: BASE_CHAIN_ID, address: STAKING_ADDRESS, abi: STAKING_ABI,
    functionName: "getClawdviction", args: address ? [address] : undefined,
    query: { refetchInterval: 15_000 },
  });

  // The moment a stake/unstake confirms, StakeCard fires this — re-read the
  // chain position and the ledger so the counter reacts instantly.
  useEffect(() => {
    const onStaked = () => {
      refetchStaked();
      refetchChainCV();
      refresh();
    };
    window.addEventListener("cv:staked", onStaked);
    return () => window.removeEventListener("cv:staked", onStaked);
  }, [refetchStaked, refetchChainCV, refresh]);

  const chainRatePerSec = staked ? Number(formatEther(staked)) / 1_728_000 : 0;
  const ratePerSec = Math.max(account?.accrualRate ?? 0, chainRatePerSec);
  const perDay = ratePerSec * 86_400;

  const totalSpent = account?.totalSpent ?? 0;

  // Chain-anchored live figure: exact earned-conviction at last read, plus
  // accrual since, minus what the ledger says was spent.
  const chainLive =
    chainCV !== undefined
      ? Number(chainCV) / CV_DIVISOR_NUM +
        chainRatePerSec * Math.max(0, (nowMs - chainCVAt) / 1000) -
        totalSpent
      : null;

  // Ledger-anchored live figure (covers pre-v2 history the chain can't see).
  const apiLive =
    !error && account
      ? account.clawdviction + account.accrualRate * Math.max(0, (nowMs - account.fetchedAt) / 1000)
      : null;

  const candidate =
    chainLive !== null && apiLive !== null
      ? Math.max(chainLive, apiLive)
      : chainLive ?? apiLive;

  // Monotonic clamp: the counter never ticks downward. The only legitimate
  // decrease is an actual spend, which shows up as totalSpent rising — that
  // resets the clamp.
  const clampRef = useRef<{ address?: string; spent: number; floor: number }>({ spent: 0, floor: 0 });
  if (clampRef.current.address !== address || totalSpent > clampRef.current.spent) {
    clampRef.current = { address, spent: totalSpent, floor: 0 };
  }
  const headline = candidate !== null ? Math.max(candidate, clampRef.current.floor) : null;
  if (headline !== null && headline > clampRef.current.floor) {
    clampRef.current.floor = headline;
  }

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
