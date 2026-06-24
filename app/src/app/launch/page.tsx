"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getProgram, getPlatformPda, getProjectPda, getVaultPda } from "@/lib/anchor";
import { SOL_PRICE_USD } from "@/lib/constants";

const MIN_RAISE_USD = 100_000;

export default function LaunchPage() {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();

  const [form, setForm] = useState({
    name: "",
    ticker: "",
    description: "",
    websiteUrl: "",
    raiseGoalUsd: MIN_RAISE_USD,
  });

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [txSig, setTxSig] = useState<string>("");
  const [error, setError] = useState<string>("");

  const raiseGoalLamports = Math.floor(
    (form.raiseGoalUsd / SOL_PRICE_USD) * LAMPORTS_PER_SOL
  );

  const handleSubmit = async () => {
    if (!publicKey || !signTransaction || !signAllTransactions) {
      setError("Connect your wallet first");
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction, signAllTransactions },
        { commitment: "confirmed" }
      );

      const program = getProgram(provider);
      const [platformPda] = getPlatformPda();

      const platform = await program.account["platform"].fetch(platformPda);
      // Anchor returns BN for u64 fields — convert explicitly to native BigInt
      const projectId = BigInt((platform as any).totalProjects.toString());

      const [projectPda] = getProjectPda(projectId);
      const [vaultPda] = getVaultPda(projectId);
      const tokenMint = Keypair.generate();

      const tx = await (program.methods as any)
        .createProject({
          name: form.name,
          ticker: form.ticker.toUpperCase(),
          description: form.description,
          websiteUrl: form.websiteUrl,
          raiseGoal: new BN(raiseGoalLamports),
        })
        .accounts({
          platform: platformPda,
          project: projectPda,
          vault: vaultPda,
          tokenMint: tokenMint.publicKey,
          dev: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: new (require("@solana/web3.js").PublicKey)(
            "SysvarRent111111111111111111111111111111111"
          ),
        })
        .signers([tokenMint])
        .rpc();

      setTxSig(tx);
      setStatus("success");

      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txSignature: tx, type: "create_project" }),
      });
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error creating project");
      setStatus("error");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="mb-10">
        <h1 className="font-body text-3xl font-bold mb-2">Launch Project</h1>
        <p className="text-quorum-muted text-sm">
          Your project will be validated by the community before anyone puts in a
          cent. Fill in the information honestly — it&apos;s your first signal.
        </p>
      </div>

      {/* Protocol rules */}
      <div className="card border-quorum-green/20 bg-quorum-green-dim mb-8">
        <h3 className="font-display text-xs text-quorum-green tracking-widest uppercase mb-3">
          Protocol Rules
        </h3>
        <ul className="space-y-1.5">
          {[
            "Phase 1: 30-day social voting period (no capital at stake)",
            "Phase 2: 270-day contribution window — minimum 1,000 holders required",
            "Each holder can own at most 0.1% of the supply",
            "Bilateral 9-month vesting — dev and holders locked equally",
            "Platform retains 0.1% of total raised",
            "If the goal is not reached → 99% automatically refunded on-chain",
          ].map((rule) => (
            <li key={rule} className="flex items-start gap-2 text-xs text-quorum-text">
              <span className="text-quorum-green mt-0.5">✓</span>
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {!publicKey ? (
        <div className="card text-center py-12 border-dashed">
          <p className="text-quorum-muted mb-4">Connect your wallet to continue</p>
        </div>
      ) : status === "success" ? (
        <SuccessState txSig={txSig} />
      ) : (
        <div className="space-y-6">
          <div>
            <label className="label">Project Name *</label>
            <input
              className="input"
              placeholder="E.g.: Quorum Finance"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={64}
            />
          </div>

          <div>
            <label className="label">Ticker *</label>
            <input
              className="input"
              placeholder="E.g.: QRMD"
              value={form.ticker}
              onChange={(e) =>
                setForm({ ...form, ticker: e.target.value.toUpperCase() })
              }
              maxLength={10}
            />
            <p className="text-xs text-quorum-muted mt-1 font-display">
              Max 10 characters. Automatically uppercased.
            </p>
          </div>

          <div>
            <label className="label">Utility Description *</label>
            <textarea
              className="input min-h-[120px] resize-none"
              placeholder="Explain what your project does, what problem it solves, and why it is useful to the community..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={512}
            />
            <p className="text-xs text-quorum-muted mt-1 font-display">
              {form.description.length}/512 characters
            </p>
          </div>

          <div>
            <label className="label">Website or Repository</label>
            <input
              className="input"
              placeholder="https://your-project.com or https://github.com/..."
              value={form.websiteUrl}
              onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
              maxLength={128}
            />
          </div>

          <div>
            <label className="label">Raise Goal (USD)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-quorum-muted font-display text-sm">
                $
              </span>
              <input
                className="input pl-8"
                type="number"
                min={MIN_RAISE_USD}
                value={form.raiseGoalUsd}
                onChange={(e) =>
                  setForm({ ...form, raiseGoalUsd: Number(e.target.value) })
                }
              />
            </div>
            <p className="text-xs text-quorum-muted mt-1 font-display">
              Minimum ${MIN_RAISE_USD.toLocaleString()} USD. Equivalent to ≈{" "}
              {(raiseGoalLamports / LAMPORTS_PER_SOL).toFixed(2)} SOL.
            </p>

            <div className="mt-3 p-4 bg-quorum-bg border border-quorum-border rounded-lg space-y-2">
              <p className="text-xs text-quorum-muted font-display tracking-wider uppercase">
                With your goal of ${form.raiseGoalUsd.toLocaleString()}:
              </p>
              <div className="flex justify-between text-xs">
                <span className="text-quorum-muted">Platform fee (0.1%)</span>
                <span className="font-display text-quorum-text">
                  ${(form.raiseGoalUsd * 0.001).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-quorum-muted">Net funds to project</span>
                <span className="font-display text-quorum-green">
                  ${(form.raiseGoalUsd * 0.999).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-quorum-muted">Max per holder (0.1%)</span>
                <span className="font-display text-quorum-text">
                  ${(form.raiseGoalUsd * 0.001).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-quorum-red-dim border border-quorum-red rounded-lg">
              <p className="text-sm text-quorum-red font-display">{error}</p>
            </div>
          )}

          <button
            className="btn-primary w-full"
            onClick={handleSubmit}
            disabled={
              status === "loading" ||
              !form.name ||
              !form.ticker ||
              !form.description ||
              form.raiseGoalUsd < MIN_RAISE_USD
            }
          >
            {status === "loading" ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner />
                Creating project...
              </span>
            ) : (
              "Create Project & Start Social Voting →"
            )}
          </button>

          <p className="text-xs text-center text-quorum-muted font-display">
            By creating the project, you agree that your wallet will be publicly
            linked to this project on-chain.
          </p>
        </div>
      )}
    </div>
  );
}

function SuccessState({ txSig }: { txSig: string }) {
  return (
    <div className="card border-quorum-green/30 text-center py-12">
      <div className="w-16 h-16 rounded-2xl bg-quorum-green-dim mx-auto mb-6 flex items-center justify-center">
        <span className="text-2xl">🎉</span>
      </div>
      <h3 className="font-body font-bold text-xl mb-2 text-quorum-green">
        Project created!
      </h3>
      <p className="text-quorum-muted text-sm mb-6">
        Social voting has started. You have 30 days for the community to
        validate your proposal.
      </p>
      <div className="bg-quorum-bg border border-quorum-border rounded-lg p-3 mb-6">
        <p className="text-xs text-quorum-muted font-display mb-1">Transaction</p>
        <a
          href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-quorum-green font-display break-all hover:underline"
        >
          {txSig}
        </a>
      </div>
      <a href="/" className="btn-primary inline-block">
        View all projects
      </a>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
