const SKILL = `# stake.onedollaraudit.com — stake CLAWD, spend conviction on audits

You are reading the agent skill file for https://stake.onedollaraudit.com —
the staking desk of One Dollar Audit, on Base (eip155:8453).

Two things happen here:

1. **Stake $CLAWD** into the staking vault. Conviction (CV) accrues to
   your address every second: on-chain it is raw \`token-wei × seconds\`; the
   human unit divides by 1.728e24 (1 CLAWD staked 20 days = 1 CV).
2. **Spend conviction** to commission AI smart-contract security audits — the
   same pipeline and jobs contract behind onedollaraudit.com.

## Addresses (Base, eip155:8453)

- Staking vault (ClawdVictionStaking): \`0xC9E377FB98a1aA6Ecf4B553cE1b57940121213bf\`
- $CLAWD token (18 decimals): \`0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07\`
- LeftClaw Services V2 (jobs): \`0xb2fb486a9569ad2c97d9c73936b46ef7fdaa413a\`
- Audit service type id: \`4\`

## 1. Stake

\`\`\`solidity
// vault @ 0xC9E377FB98a1aA6Ecf4B553cE1b57940121213bf
function stake(uint256 amount)        // min 1_000e18 (1,000 CLAWD); approve first
function unstake(uint256 stakeIndex)  // whole slots only; banks the earned CV
function getActiveStakes(address) view returns (uint256[] amounts, uint256[] stakedAts, uint256[] indices)
function getClawdviction(address) view returns (uint256)  // raw wei-seconds, lifetime
\`\`\`

Use the \`indices\` array from \`getActiveStakes\` as the \`unstake\` argument —
storage indices are stable, display order is not. There is no lock-up, no
penalty, no owner, no pause on this contract.

## 2. Check your conviction

The spendable balance lives in larv.ai's ledger (spends are netted off there;
the chain figure is lifetime-earned only):

\`\`\`
GET https://larv.ai/api/clawdviction/<wallet>
→ { clawdviction, balance, accrualRate, totalEarned, totalSpent }
\`\`\`

Gate spends on \`balance\`. Display \`clawdviction\`.

## 3. Commission an audit with conviction

The fee is \`ceil(highestCVBalance / cvDivisor)\` — a fixed share of the
largest conviction balance in the system, same price for everyone. Read
\`cvDivisor\` from \`getServiceType(4)\` on the jobs contract; read the highest
balance from \`GET https://larv.ai/api/cv/highest\`.

Flow:

1. Sign the exact message \`larv.ai CV Spend\` (EIP-191 personal_sign; the
   signature is reusable — cache it).
2. \`POST https://stake.onedollaraudit.com/api/cv-spend\` with JSON
   \`{ "wallet": "0x...", "signature": "0x...", "amount": <cv fee> }\` —
   this debits the ledger. A non-2xx response means nothing was spent.
3. Send the Base transaction
   \`postJobWithCV(4, <cv fee>, "<contract address or source + concerns>")\`
   on \`0xb2fb486a9569ad2c97d9c73936b46ef7fdaa413a\`. Parse the \`JobPosted\`
   event for your \`jobId\`.
4. Poll \`GET https://stake.onedollaraudit.com/api/jobs/<jobId>\` (respect
   \`pollIntervalSeconds\`) until \`status\` is \`complete\`, then fetch
   \`reportUrl\`.

Persist the jobId — it is your receipt. If step 3 fails after step 2
succeeded, retry step 3 with the same amount; do not spend again.

## Rules

- One contract per engagement. The description is public on-chain forever —
  don't put secrets in it.
- Conviction can't be bought, only accrued by staking. No dollars are
  accepted here; for $1 x402-paid audits use
  https://onedollaraudit.com/skill.md instead.
- An AI audit is a serious first pass, not a substitute for a full manual
  audit on high-value systems.
`;

export async function GET() {
  return new Response(SKILL, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
