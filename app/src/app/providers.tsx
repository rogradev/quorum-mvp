"use client";

import { useMemo } from "react";
import {
  ConnectionProvider as _ConnectionProvider,
  WalletProvider as _WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider as _WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { RPC_ENDPOINT, TWITTER_URL } from "@/lib/constants";
import "@solana/wallet-adapter-react-ui/styles.css";

// @types/react 18.3+ tightened FC return types, breaking wallet-adapter's
// type declarations compiled against 18.2. Cast to generic ComponentType to unblock.
type AnyProvider = React.ComponentType<{ children: React.ReactNode; [k: string]: unknown }>;
const ConnectionProvider = _ConnectionProvider as unknown as AnyProvider;
const WalletProvider = _WalletProvider as unknown as AnyProvider;
const WalletModalProvider = _WalletModalProvider as unknown as AnyProvider;

export default function Providers({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Nav />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
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
        </div>
      </div>
    </nav>
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
