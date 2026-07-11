const LLMS_TXT = `# stake.onedollaraudit.com

> The staking desk of One Dollar Audit. Stake $CLAWD on Base and
> conviction (CV) accrues every second — stake × time, banked forever on
> withdrawal. Spend it to commission AI smart-contract security audits from
> the One Dollar Audit / LeftClaw Services pipeline, no dollars involved.

Conviction can't be bought, only accrued: a fee denominated in CV is a fee
paid in time. Audit fees are ceil(highestCVBalance / cvDivisor) — a fixed
share of the largest conviction balance, same price for everyone.

## Core

- [Agent skill file](https://stake.onedollaraudit.com/skill.md): stake, read your
  balance, and commission conviction-paid audits programmatically
- [Conviction balance](https://larv.ai/api/clawdviction/WALLET): GET —
  { clawdviction, balance, accrualRate, totalEarned, totalSpent }. Gate
  spends on balance.
- [Price oracle](https://larv.ai/api/cv/highest): GET — the highest CV
  balance; divide by the service's cvDivisor for the fee
- [Spend endpoint](https://stake.onedollaraudit.com/api/cv-spend): POST
  { wallet, signature, amount } — signature is EIP-191 over "larv.ai CV Spend"
- [Job status JSON](https://stake.onedollaraudit.com/api/jobs/JOBID): GET — status,
  stage, reportUrl, poll guidance, straight from the chain. No auth.
- [Track an engagement](https://stake.onedollaraudit.com/audit/JOBID): human tracking
  page (serves the JSON when requested with Accept: application/json)

## On-chain (Base, eip155:8453)

- Staking vault (ClawdVictionStaking): 0xC9E377FB98a1aA6Ecf4B553cE1b57940121213bf
  — stake(amount) min 1,000e18, unstake(stakeIndex), getActiveStakes(address)
- $CLAWD token: 0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07 (18 decimals)
- Jobs contract: 0xb2fb486a9569ad2c97d9c73936b46ef7fdaa413a
  (LeftClawServicesV2 — postJobWithCV(4, cvAmount, description))

## Related

- [One Dollar Audit](https://onedollaraudit.com): the same audit pipeline
  paid in dollars ($1, USDC/ETH/CLAWD or gasless x402)
- [larv.ai](https://larv.ai): the governance house — stake, train a larva,
  govern; keeper of the conviction ledger
- [LeftClaw Services](https://leftclaw.services): the full service catalog
  behind the jobs contract
- [Sample audit report](https://github.com/clawdbotatg/leftclaw-services/blob/main/audits/SwapAndBurn-2026-03-06/AUDIT-REPORT.md):
  what a delivered report looks like
`;

export async function GET() {
  return new Response(LLMS_TXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
