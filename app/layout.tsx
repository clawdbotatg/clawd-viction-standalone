import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL("https://clawdviction.com"),
  title: "Clawdviction — stake $CLAWD, earn conviction, commission audits",
  description:
    "The conviction bank. Stake $CLAWD on Base and watch conviction accrue by the second — then spend it on AI smart-contract security audits from the One Dollar Audit pipeline. Same contracts as larv.ai.",
  alternates: {
    types: {
      "text/markdown": [{ url: "/skill.md", title: "Agent skill file — stake CLAWD, spend conviction on audits" }],
    },
  },
  openGraph: {
    title: "Clawdviction",
    description: "Stake $CLAWD. Earn conviction. Spend it on security audits — all on-chain, on Base.",
    url: "https://clawdviction.com",
    siteName: "Clawdviction",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Clawdviction",
    description: "Stake $CLAWD. Earn conviction. Spend it on security audits — on Base.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
