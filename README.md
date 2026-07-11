# Clawdviction

**clawdviction.com** — the conviction bank. A standalone staking portal for
$CLAWD on Base: deposit into the ClawdViction vault, watch conviction (CV)
accrue by the second, and spend it on AI smart-contract security audits from
the One Dollar Audit / LeftClaw Services pipeline.

A companion desk to [onedollaraudit.com](https://onedollaraudit.com) (same
design language, same jobs contract, same audit pipeline) and
[larv.ai](https://larv.ai) (same staking contract, same conviction ledger).

## How it works

- **Stake** — `stake(amount)` on the ClawdViction contract
  (`0xC9E377FB98a1aA6Ecf4B553cE1b57940121213bf`, Base). Min 1,000 CLAWD per
  deposit, no lock-up, whole-slot withdrawals, conviction banked on unstake.
- **Conviction** — on-chain it's raw `token-wei × seconds`; the human unit
  divides by 1.728e24 (1 CLAWD staked 20 days = 1 CV). The spendable balance
  (with spends netted out) lives in larv.ai's ledger:
  `GET https://larv.ai/api/clawdviction/<wallet>`.
- **Audits** — the fee is `ceil(highestCVBalance / cvDivisor)` (divisor from
  `getServiceType(4)` on LeftClawServicesV2
  `0xb2fb486a9569ad2c97d9c73936b46ef7fdaa413a`). The user signs
  `"larv.ai CV Spend"`, `/api/cv-spend` debits the ledger, then
  `postJobWithCV(4, cv, description)` files the job on-chain. Tracking at
  `/audit/<id>`, JSON at `/api/jobs/<id>`, agent docs at `/skill.md` and
  `/llms.txt`.

## Run

```bash
npm install
npm run dev
```

## Environment

No env vars are required. Optional:

- `CV_SPEND_SECRET` — the shared secret larv.ai's `POST /api/cv/spend`
  expects. With it set, conviction spends go straight to larv.ai. Without it,
  `/api/cv-spend` relays through leftclaw.services' cv-spend route (which
  holds the secret server-side) — works, but adds a hop you don't control.
  For production, get the secret from the larv.ai deployment and set it.
- `BASE_RPC_URL` — RPC used server-side for signature verification and job
  reads (defaults to `https://mainnet.base.org`).

Deploys to Vercel zero-config.
