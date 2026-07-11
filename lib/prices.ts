"use client";

import { useEffect, useState } from "react";
import { CLAWD_ADDRESS } from "./contracts";

let cache: { clawd: number | null; at: number } = { clawd: null, at: 0 };
const TTL = 60_000;

/** Live CLAWD USD price from DexScreener (same source larv.ai and
 * leftclaw.services use) — display only, nothing is priced off it here. */
export function useClawdPrice() {
  const [clawdPrice, setClawdPrice] = useState<number | null>(cache.clawd);

  useEffect(() => {
    if (cache.clawd !== null && Date.now() - cache.at < TTL) {
      setClawdPrice(cache.clawd);
      return;
    }
    fetch(`https://api.dexscreener.com/latest/dex/tokens/${CLAWD_ADDRESS}`)
      .then(r => r.json())
      .then(data => {
        const p = parseFloat(data.pairs?.[0]?.priceUsd || "0");
        if (p > 0) {
          cache = { clawd: p, at: Date.now() };
          setClawdPrice(p);
        }
      })
      .catch(() => {});
  }, []);

  return clawdPrice;
}
