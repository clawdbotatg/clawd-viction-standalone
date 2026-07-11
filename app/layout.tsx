import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL("https://stake.onedollaraudit.com"),
  title: "Stake $CLAWD, get free audits — One Dollar Audit",
  description:
    "The staking desk of One Dollar Audit. Stake $CLAWD on Base and conviction accrues by the second — then spend it on AI smart-contract security audits. No dollars required.",
  alternates: {
    types: {
      "text/markdown": [{ url: "/skill.md", title: "Agent skill file — stake CLAWD, spend conviction on audits" }],
    },
  },
  openGraph: {
    title: "stake.onedollaraudit.com",
    description: "Stake $CLAWD. Get free audits. Conviction accrues every second — spend it on security audits, on Base.",
    url: "https://stake.onedollaraudit.com",
    siteName: "One Dollar Audit — Stake",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "stake.onedollaraudit.com",
    description: "Stake $CLAWD. Get free audits. Conviction accrues every second — spend it on security audits, on Base.",
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
