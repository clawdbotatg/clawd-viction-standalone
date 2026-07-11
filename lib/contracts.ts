import { parseAbi } from "viem";

/** ClawdViction staking — Base mainnet. The same contract larv.ai stakes
 * into: deposit CLAWD, conviction accrues by the second (amount × time). */
export const STAKING_ADDRESS = "0xC9E377FB98a1aA6Ecf4B553cE1b57940121213bf" as const;

/** $CLAWD token (Base). */
export const CLAWD_ADDRESS = "0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07" as const;

/** LeftClaw Services V2 — Base mainnet. Audits are commissioned against its
 * Smart Contract Audit service (service type 4), paid with conviction via
 * postJobWithCV. Same contract onedollaraudit.com posts to. */
export const LEFTCLAW_ADDRESS = "0xb2fb486a9569ad2c97d9c73936b46ef7fdaa413a" as const;
export const AUDIT_SERVICE_TYPE_ID = 4;

export const BASE_CHAIN_ID = 8453;

/** Minimum per stake() call, enforced on-chain: 1,000 CLAWD. */
export const MIN_STAKE_WEI = 1_000n * 10n ** 18n;

export const STAKING_ABI = parseAbi([
  "function stake(uint256 amount)",
  "function unstake(uint256 stakeIndex)",
  "function getClawdviction(address user) view returns (uint256)",
  "function getActiveStakes(address user) view returns (uint256[] amounts, uint256[] stakedAts, uint256[] indices)",
  "function totalStaked(address) view returns (uint256)",
  "function totalSupplyStaked() view returns (uint256)",
  "event Staked(address indexed user, uint256 amount, uint256 stakeIndex, uint256 stakedAt)",
  "event Unstaked(address indexed user, uint256 amount, uint256 stakeIndex, uint256 stakedAt, uint256 unstakedAt)",
]);

export const LEFTCLAW_ABI = parseAbi([
  "function postJobWithCV(uint256 serviceTypeId, uint256 cvAmount, string description)",
  "function getServiceType(uint256 id) view returns ((uint256 id, string name, string slug, uint256 priceUsd, uint256 cvDivisor, string status))",
  "function getJob(uint256 jobId) view returns ((uint256 id, address client, uint256 serviceTypeId, uint256 paymentClawd, uint256 priceUsd, string description, uint8 status, uint256 createdAt, uint256 startedAt, uint256 completedAt, string resultCID, address worker, bool paymentClaimed, uint8 paymentMethod, uint256 cvAmount, string currentStage))",
  "event JobPosted(uint256 indexed jobId, address indexed client, uint256 serviceTypeId, uint256 paymentClawd, uint256 priceUsd, uint8 paymentMethod, uint256 cvAmount)",
]);

export const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
]);

export const JOB_STATUS = ["Open", "In Progress", "Completed", "Declined", "Cancelled", "Reassigned"] as const;

export const LARV_APP = "https://larv.ai";
export const LEFTCLAW_APP = "https://leftclaw.services";
export const ONEDOLLAR_APP = "https://onedollaraudit.com";
export const SITE_URL = "https://clawdviction.com";
