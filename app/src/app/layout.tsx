"use client";

import { useMemo } from "react";
import {
  ConnectionProvider as _ConnectionProvider,
  WalletProvider as _WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider as _WalletModalProvider } from "@solana/wallet-adapter-react-ui";

// @types/react 18.3+ tightened FC return types, breaking wallet-adapter's
// type declarations compiled against 18.2. Cast to generic ComponentType to unblock.
type AnyProvider = React.ComponentType<{ children: React.ReactNode; [k: string]: unknown }>;
const ConnectionProvider = _ConnectionProvider as unknown as AnyProvider;
const WalletProvider = _WalletProvider as unknown as AnyProvider;
const WalletModalProvider = _WalletModalProvider as unknown as AnyProvider;
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { RPC_ENDPOINT, TWITTER_URL, SITE_NAME } from "@/lib/constants";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <html lang="en">
      <head>
        <title>Quorum — The rug-proof launchpad</title>
        <meta name="description" content="Community validates before anyone funds. 9-month bilateral vesting. 0.1% holder limit. Built on Solana." />
        <meta property="og:title" content="Quorum — The rug-proof launchpad" />
        <meta property="og:description" content="The token launchpad where utility is the only metric that matters." />
        <meta name="twitter:site" content="@QuorumBuild" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-quorum-bg text-quorum-text font-body antialiased">
        <ConnectionProvider endpoint={RPC_ENDPOINT}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
              <Nav />
              <main className="min-h-screen">{children}</main>
              <Footer />
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </body>
    </html>
  );
}

function Nav() {
  return (
    <nav className="border-b border-quorum-border bg-quorum-surface/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-quorum-green flex items-center justify-center">
            <span className="text-quorum-bg font-display font-bold text-sm">Q</span>
          </div>
          <span className="font-display text-lg text-quorum-text tracking-tight">
            QUORUM
          </span>
          <span className="text-xs text-quorum-muted font-display bg-quorum-border px-2 py-0.5 rounded">
            devnet
          </span>
        </a>

        <div className="flex items-center gap-6">
          <a href="/" className="text-sm text-quorum-muted hover:text-quorum-text transition-colors">
            Projects
          </a>
          <a href="/launch" className="text-sm text-quorum-muted hover:text-quorum-text transition-colors">
            Launch
          </a>
          <a
            href={TWITTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-quorum-muted hover:text-quorum-green transition-colors font-display"
          >
            @QuorumBuild
          </a>
          <WalletButton />
        </div>
      </div>
    </nav>
  );
}

function WalletButton() {
  const { WalletMultiButton } = require("@solana/wallet-adapter-react-ui");
  return (
    <WalletMultiButton
      style={{
        backgroundColor: "transparent",
        border: "1px solid #1E2A38",
        borderRadius: "8px",
        color: "#E2EBF4",
        fontSize: "13px",
        height: "36px",
        fontFamily: "'DM Mono', monospace",
      }}
    />
  );
}

function Footer() {
  return (
    <footer className="border-t border-quorum-border mt-24 py-12">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-quorum-green flex items-center justify-center">
            <span className="text-quorum-bg font-display font-bold text-xs">Q</span>
          </div>
          <span className="font-display text-sm text-quorum-muted">QUORUM</span>
        </div>
        <p className="text-xs text-quorum-muted font-display italic">
          Tokens with intention. Community as filter.
        </p>
        <div className="flex items-center gap-4">
          <a
            href={TWITTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-quorum-muted hover:text-quorum-green font-display transition-colors"
          >
            @QuorumBuild
          </a>
          <span className="text-xs text-quorum-muted font-display">
            quorumbuild.xyz
          </span>
        </div>
      </div>
    </footer>
  );
}
