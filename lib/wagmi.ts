import { http, createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    injected(),
    coinbaseWallet({ appName: "One Dollar Audit — Stake" }),
  ],
  transports: {
    [base.id]: http("https://mainnet.base.org"),
  },
  ssr: true,
});
