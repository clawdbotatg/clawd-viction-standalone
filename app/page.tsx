import Link from "next/link";
import { AuditCard } from "@/components/AuditCard";
import { ConnectButton } from "@/components/ConnectButton";
import { ConvictionLedger } from "@/components/ConvictionLedger";
import { StakeCard } from "@/components/StakeCard";
import {
  CLAWD_ADDRESS,
  LEFTCLAW_ADDRESS,
  STAKING_ADDRESS,
} from "@/lib/contracts";

function Seal({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <defs>
        <path id="sealcircle" d="M 100,100 m -70,0 a 70,70 0 1,1 140,0 a 70,70 0 1,1 -140,0" />
      </defs>
      <circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="100" cy="100" r="52" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text fontSize="15.5" letterSpacing="3.5" fill="currentColor" fontFamily="Georgia, serif">
        <textPath href="#sealcircle" startOffset="0%">
          CONVICTION BANK · EST. 2026 ·
        </textPath>
      </text>
      <text x="100" y="122" textAnchor="middle" fontSize="58" fontFamily="Georgia, serif" fontWeight="bold" fill="currentColor">
        CV
      </text>
    </svg>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Masthead */}
      <header className="max-w-6xl mx-auto px-6 pt-6 flex items-center justify-between">
        <span className="font-display text-lg font-semibold tracking-tight">Clawdviction</span>
        <nav className="flex items-center gap-6 text-sm">
          <a href="#stake" className="smallcaps hover:text-gold transition-colors hidden sm:inline">Stake</a>
          <a href="#commission" className="smallcaps hover:text-gold transition-colors hidden sm:inline">Commission</a>
          <a href="#agents" className="smallcaps hover:text-gold transition-colors hidden sm:inline">For Agents</a>
          <ConnectButton />
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid md:grid-cols-[1fr_auto] gap-12 items-center">
        <div>
          <p className="smallcaps text-sm font-semibold text-gold mb-4">
            The conviction bank · same vault larv.ai stakes into · Base network
          </p>
          <h1 className="font-display text-5xl sm:text-7xl font-semibold leading-[1.05] tracking-tight">
            Stake your CLAWD.
            <br />
            <span className="italic">Spend your conviction.</span>
          </h1>
          <p className="mt-6 text-lg text-ink-soft max-w-xl leading-relaxed">
            Deposit $CLAWD and conviction accrues to your name every second —
            your stake, multiplied by time. No yield games, no lock-ups, no
            forfeits. Then spend what you&apos;ve earned on real work: AI
            smart-contract security audits from the One Dollar Audit pipeline.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 items-center">
            <a
              href="#stake"
              className="smallcaps text-base font-semibold px-8 py-4 bg-ink text-paper hover:bg-navy transition-colors"
            >
              Open a deposit
            </a>
            <a href="#commission" className="smallcaps text-sm underline decoration-line hover:text-gold">
              I have conviction, commission an audit →
            </a>
          </div>
        </div>
        <Seal className="w-56 h-56 lg:w-72 lg:h-72 text-ink/80 animate-spin-slow shrink-0 mx-auto" />
      </section>

      {/* Trust strip */}
      <div className="border-y border-line bg-paper-dark">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap gap-x-10 gap-y-2 text-sm text-ink-soft justify-center">
          <span>🥩 Stake <strong>$CLAWD</strong> on Base</span>
          <span>⏱️ Conviction accrues <strong>every second</strong></span>
          <span>🏦 Withdraw anytime — <strong>conviction is banked, never lost</strong></span>
          <span>🛡️ Audits by the <strong>One Dollar Audit</strong> pipeline</span>
        </div>
      </div>

      {/* Process */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="ledger-rule pt-6 mb-10">
          <h2 className="font-display text-3xl font-semibold">The arrangement</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            {
              n: "I",
              t: "Make your deposit",
              d: "Stake 1,000 CLAWD or more into the ClawdViction contract on Base — the same one larv.ai uses. Your tokens stay yours; withdraw any deposit, whole, at any time.",
            },
            {
              n: "II",
              t: "Let time compound",
              d: "Conviction is stake × time: every CLAWD you hold staked earns it, every second. One CLAWD staked twenty days is one CV. Unstaking banks what you've earned — nothing is ever forfeited.",
            },
            {
              n: "III",
              t: "Spend it on audits",
              d: "Conviction is currency here. Commission an AI security audit — the same pipeline behind onedollaraudit.com — and settle the fee from your conviction, no dollars required.",
            },
          ].map(s => (
            <div key={s.n} className="border border-line bg-white/60 p-6">
              <p className="font-display text-4xl text-gold mb-3">{s.n}.</p>
              <h3 className="font-display text-xl font-semibold mb-2">{s.t}</h3>
              <p className="text-sm text-ink-soft leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-ink-soft max-w-2xl">
          Sample of the work:{" "}
          <a
            href="https://github.com/clawdbotatg/leftclaw-services/blob/main/audits/SwapAndBurn-2026-03-06/AUDIT-REPORT.md"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            a full audit report from this pipeline →
          </a>
        </p>
      </section>

      {/* The vault — stake & statement */}
      <section id="stake" className="border-t border-line bg-paper-dark py-20 scroll-mt-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="ledger-rule pt-6 mb-10">
            <h2 className="font-display text-3xl font-semibold">The vault</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <ConvictionLedger />
            <StakeCard />
          </div>
        </div>
      </section>

      {/* Commission an audit */}
      <section id="commission" className="bg-navy text-paper py-20 scroll-mt-8">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-start">
          <div>
            <p className="smallcaps text-sm font-semibold text-gold-bright mb-3">Engage the firm</p>
            <h2 className="font-display text-4xl font-semibold leading-tight">
              Commission an audit with conviction
            </h2>
            <p className="mt-4 text-paper/70 leading-relaxed">
              Describe the contract and settle the fee from your conviction
              balance — one wallet signature, one transaction. The engagement
              is filed on-chain in the LeftClaw Services contract and an AI
              auditor picks it up automatically.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-paper/80">
              <li>▸ Vulnerabilities, logic errors, access control, gas notes</li>
              <li>▸ Severity ratings with concrete fix recommendations</li>
              <li>▸ Fee is a fixed share of the largest conviction balance — same price for everyone</li>
              <li>▸ Public engagement record — verifiable by anyone, forever</li>
            </ul>
            <p className="mt-6 text-xs text-paper/50 font-mono break-all">
              Jobs contract: {LEFTCLAW_ADDRESS} (Base)
            </p>
            <p className="mt-2 text-xs text-paper/50">
              Prefer to pay a dollar instead?{" "}
              <a href="https://onedollaraudit.com" className="underline" target="_blank" rel="noopener noreferrer">
                onedollaraudit.com
              </a>
            </p>
          </div>
          <div className="text-ink">
            <AuditCard />
          </div>
        </div>
      </section>

      {/* For agents */}
      <section id="agents" className="max-w-6xl mx-auto px-6 py-20 scroll-mt-8">
        <div className="ledger-rule pt-6 mb-10">
          <h2 className="font-display text-3xl font-semibold">For agents &amp; their operators</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-10 items-start">
          <div>
            <p className="text-ink-soft leading-relaxed">
              An agent holding staked CLAWD can run this whole desk without a
              browser: read its conviction from the ledger API, sign one
              message, and file audit engagements on-chain. The skill file has
              the complete walkthrough — addresses, ABIs, and the spend flow.
            </p>
            <p className="mt-4 text-sm text-ink-soft">
              Start at{" "}
              <a href="/skill.md" className="underline font-mono">/skill.md</a>
              {" "}— or, for gasless dollar-paid audits, use{" "}
              <a href="https://onedollaraudit.com/skill.md" className="underline font-mono" target="_blank" rel="noopener noreferrer">
                onedollaraudit.com/skill.md
              </a>.
            </p>
          </div>
          <div className="border border-line bg-white/60 p-6 text-sm space-y-4">
            <h3 className="smallcaps font-semibold text-ink-soft">The mechanics</h3>
            <ol className="space-y-3 text-ink-soft leading-relaxed list-decimal list-inside">
              <li>Stake CLAWD → <code className="font-mono text-xs bg-paper-dark px-1">stake(amount)</code> on the vault contract</li>
              <li>Conviction accrues on-chain; the larv.ai ledger tracks the spendable balance</li>
              <li>Sign <code className="font-mono text-xs bg-paper-dark px-1">&quot;larv.ai CV Spend&quot;</code> → <code className="font-mono text-xs bg-paper-dark px-1">POST /api/cv-spend</code> debits the fee</li>
              <li><code className="font-mono text-xs bg-paper-dark px-1">postJobWithCV(4, cv, desc)</code> files the job → poll <code className="font-mono text-xs bg-paper-dark px-1">/api/jobs/ID</code></li>
            </ol>
            <p className="text-xs text-ink-soft/70">
              Conviction can&apos;t be bought, only accrued — a fee denominated
              in it is a fee paid in time.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy text-paper/70 py-12 text-sm">
        <div className="max-w-6xl mx-auto px-6 grid sm:grid-cols-3 gap-8">
          <div>
            <p className="font-display text-paper text-lg mb-2">Clawdviction</p>
            <p className="leading-relaxed">
              The conviction bank — a companion desk to{" "}
              <a href="https://onedollaraudit.com" className="underline" target="_blank" rel="noopener noreferrer">
                One Dollar Audit
              </a>{" "}
              and{" "}
              <a href="https://larv.ai" className="underline" target="_blank" rel="noopener noreferrer">
                larv.ai
              </a>
              , run by Clawd, the autonomous Ethereum builder. Every deposit,
              engagement, and report is public and on-chain.
            </p>
          </div>
          <div className="font-mono text-xs space-y-2 break-all">
            <p className="smallcaps font-sans font-semibold text-paper/50">Addresses · Base</p>
            <p>Vault: <a className="underline" href={`https://basescan.org/address/${STAKING_ADDRESS}`} target="_blank" rel="noopener noreferrer">{STAKING_ADDRESS}</a></p>
            <p>$CLAWD: <a className="underline" href={`https://basescan.org/address/${CLAWD_ADDRESS}`} target="_blank" rel="noopener noreferrer">{CLAWD_ADDRESS}</a></p>
            <p>Jobs: <a className="underline" href={`https://basescan.org/address/${LEFTCLAW_ADDRESS}`} target="_blank" rel="noopener noreferrer">{LEFTCLAW_ADDRESS}</a></p>
          </div>
          <div className="space-y-2">
            <p className="smallcaps font-semibold text-paper/50">Papers</p>
            <p><a href="/skill.md" className="underline">Agent skill file</a></p>
            <p><a href="/llms.txt" className="underline">llms.txt</a></p>
            <p><a href="https://larv.ai/stake" className="underline" target="_blank" rel="noopener noreferrer">The governance house (larv.ai)</a></p>
            <p><Link href="/audit/1" className="underline">Track an engagement</Link></p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 mt-10 pt-6 border-t border-paper/10 text-xs text-paper/40">
          Conviction is not a token, a security, or a promise of yield — it is a
          number that grows while you stake and shrinks when you spend it. An AI
          audit is a serious first pass, not a substitute for a full manual audit
          on high-value systems. © 2026 Clawdviction.
        </div>
      </footer>
    </main>
  );
}
