"use client";

import { useEffect, useState } from "react";
import { formatEther, parseEther } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { ConnectButton } from "./ConnectButton";
import {
  BASE_CHAIN_ID,
  CLAWD_ADDRESS,
  ERC20_ABI,
  MIN_STAKE_WEI,
  STAKING_ABI,
  STAKING_ADDRESS,
} from "@/lib/contracts";
import { formatCV } from "@/lib/conviction";

type Step = "idle" | "approving" | "staking" | "unstaking";

function fmt(wei: bigint): string {
  return Number(formatEther(wei)).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function StakeCard() {
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: BASE_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();

  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 10_000);
    return () => clearInterval(t);
  }, []);

  const wrongNetwork = !!address && chainId !== BASE_CHAIN_ID;

  const { data: balance, refetch: refetchBalance } = useReadContract({
    chainId: BASE_CHAIN_ID, address: CLAWD_ADDRESS, abi: ERC20_ABI,
    functionName: "balanceOf", args: address ? [address] : undefined,
    query: { refetchInterval: 12_000 },
  });
  const { data: activeStakes, refetch: refetchStakes } = useReadContract({
    chainId: BASE_CHAIN_ID, address: STAKING_ADDRESS, abi: STAKING_ABI,
    functionName: "getActiveStakes", args: address ? [address] : undefined,
    query: { refetchInterval: 12_000 },
  });

  let parsed = 0n;
  try {
    parsed = amount ? parseEther(amount) : 0n;
  } catch {
    parsed = 0n;
  }
  const belowMin = parsed > 0n && parsed < MIN_STAKE_WEI;
  const insufficient = !!address && balance !== undefined && parsed > balance;
  const busy = step !== "idle";

  async function waitForAllowance(needed: bigint) {
    if (!address || !publicClient) throw new Error("Not connected");
    for (let i = 0; i < 20; i++) {
      const a = await publicClient.readContract({
        address: CLAWD_ADDRESS, abi: ERC20_ABI, functionName: "allowance",
        args: [address, STAKING_ADDRESS],
      });
      if (a >= needed) return;
      await new Promise(r => setTimeout(r, 1500));
    }
    throw new Error("Approval didn't confirm — please try again");
  }

  async function stake() {
    if (!address || !publicClient || wrongNetwork || parsed === 0n) return;
    setError(null);
    setNotice(null);
    try {
      const allowance = await publicClient.readContract({
        address: CLAWD_ADDRESS, abi: ERC20_ABI, functionName: "allowance",
        args: [address, STAKING_ADDRESS],
      });
      if (allowance < parsed) {
        setStep("approving");
        await writeContractAsync({
          chainId: BASE_CHAIN_ID, address: CLAWD_ADDRESS, abi: ERC20_ABI,
          functionName: "approve", args: [STAKING_ADDRESS, parsed],
        });
        await waitForAllowance(parsed);
      }
      setStep("staking");
      const hash = await writeContractAsync({
        chainId: BASE_CHAIN_ID, address: STAKING_ADDRESS, abi: STAKING_ABI,
        functionName: "stake", args: [parsed],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setAmount("");
      setNotice(`Deposited ${fmt(parsed)} CLAWD — conviction is accruing.`);
      refetchBalance();
      refetchStakes();
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string };
      setError((err.shortMessage || err.message || String(e)).slice(0, 300));
    } finally {
      setStep("idle");
    }
  }

  async function unstake(storageIndex: bigint, amountWei: bigint) {
    if (!address || !publicClient || wrongNetwork || busy) return;
    setError(null);
    setNotice(null);
    setStep("unstaking");
    try {
      const hash = await writeContractAsync({
        chainId: BASE_CHAIN_ID, address: STAKING_ADDRESS, abi: STAKING_ABI,
        functionName: "unstake", args: [storageIndex],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setNotice(`Withdrew ${fmt(amountWei)} CLAWD — its conviction is banked to your account.`);
      refetchBalance();
      refetchStakes();
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string };
      setError((err.shortMessage || err.message || String(e)).slice(0, 300));
    } finally {
      setStep("idle");
    }
  }

  const [amounts, stakedAts, indices] = activeStakes ?? [[], [], []];

  return (
    <div className="border border-line bg-paper shadow-xl">
      <div className="border-b border-line bg-paper-dark px-6 py-4 flex items-baseline justify-between">
        <span className="smallcaps text-sm font-semibold text-ink-soft">Deposit Form 1-B</span>
        <span className="font-display text-2xl font-semibold">CLAWD</span>
      </div>

      <div className="p-6 space-y-5">
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label className="smallcaps text-sm font-semibold text-ink-soft">Sum to deposit</label>
            {mounted && address && balance !== undefined && (
              <span className="text-xs text-ink-soft font-mono tabular">balance: {fmt(balance)}</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              className="w-full border border-line bg-white px-4 py-3 text-sm font-mono focus:outline-none focus:border-ink"
              placeholder="1,000 CLAWD minimum"
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/,/g, ""))}
              disabled={busy}
            />
            <button
              onClick={() => balance !== undefined && setAmount(formatEther(balance))}
              disabled={busy || !address || balance === undefined}
              className="smallcaps px-4 py-3 text-sm font-semibold border border-line bg-paper hover:border-ink-soft transition-colors disabled:opacity-40"
            >
              Max
            </button>
          </div>
          {belowMin && <p className="mt-2 text-sm text-seal">The house takes deposits of 1,000 CLAWD or more.</p>}
          {insufficient && (
            <p className="mt-2 text-sm text-seal">
              Insufficient CLAWD on Base.{" "}
              <a
                className="underline"
                href={`https://app.uniswap.org/swap?outputCurrency=${CLAWD_ADDRESS}&chain=base`}
                target="_blank" rel="noopener noreferrer"
              >
                Get CLAWD →
              </a>
            </p>
          )}
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

        {mounted && address && !wrongNetwork && (
          <button
            onClick={stake}
            disabled={busy || parsed === 0n || belowMin || insufficient}
            className="w-full py-4 bg-ink text-paper smallcaps text-base font-semibold tracking-wider hover:bg-navy transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {step === "approving" && "Approving in wallet…"}
            {step === "staking" && "Recording the deposit on-chain…"}
            {step === "unstaking" && "Processing withdrawal…"}
            {step === "idle" && "Deposit & begin accruing"}
          </button>
        )}

        {error && <p className="text-sm text-seal border border-seal/40 bg-seal/5 px-4 py-3">{error}</p>}
        {notice && <p className="text-sm text-mint border border-mint/40 bg-mint/5 px-4 py-3">{notice}</p>}

        {mounted && address && amounts.length > 0 && (
          <div>
            <p className="smallcaps text-sm font-semibold text-ink-soft mb-2">Deposits on record</p>
            <div className="border border-line divide-y divide-line text-sm">
              {amounts.map((amt, i) => {
                const since = Number(stakedAts[i]);
                return (
                  <div key={String(indices[i])} className="flex items-center justify-between px-4 py-3 gap-3">
                    <div>
                      <p className="font-mono tabular">{fmt(amt)} CLAWD</p>
                      <p className="text-xs text-ink-soft tabular">
                        since {new Date(since * 1000).toLocaleDateString()} ·{" "}
                        {formatCV(Number(formatEther(amt)) * (now - since) / 1_728_000)} CV earned
                      </p>
                    </div>
                    <button
                      onClick={() => unstake(indices[i], amt)}
                      disabled={busy}
                      className="smallcaps text-xs font-semibold px-3 py-2 border border-line hover:border-ink-soft transition-colors disabled:opacity-40 shrink-0"
                    >
                      Withdraw
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-xs text-ink-soft/70 leading-relaxed">
          Deposits are held by the ClawdViction staking contract on Base — no
          lock-up, no penalty, withdraw any deposit whole at any time. Conviction
          earned is banked on withdrawal, never forfeited.
        </p>
      </div>
    </div>
  );
}
