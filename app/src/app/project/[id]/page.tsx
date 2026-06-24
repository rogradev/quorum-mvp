"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { SystemProgram, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { getProgram, getPlatformPda, getProjectPda, getVotePda, getContributionPda, getVaultPda, PYTH_FEED } from "@/lib/anchor";
import {
  PROJECT_STATE_LABELS,
  PROJECT_STATE_COLORS,
  lamportsToUsd,
  formatUsd,
  formatNumber,
  timeRemaining,
  SOCIAL_VOTE_DURATION_MS,
  ECONOMIC_PHASE_DURATION_MS,
  SOL_PRICE_USD,
} from "@/lib/constants";
import { Project } from "@/types";

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [hasContributed, setHasContributed] = useState(false);
  const [contributionUsd, setContributionUsd] = useState(1);
  const [actionStatus, setActionStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [actionError, setActionError] = useState("");
  const [graduateLoading, setGraduateLoading] = useState(false);
  const [graduateError, setGraduateError] = useState("");
  const [graduateSuccess, setGraduateSuccess] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [onChainContrib, setOnChainContrib] = useState<{ tokensAllocated: number; claimed: boolean } | null>(null);
  const [contribLoading, setContribLoading] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  useEffect(() => {
    if (project?.state === "GRADUATED" && publicKey) {
      fetchOnChainContrib();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.state, publicKey?.toString()]);

  async function fetchProject() {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOnChainContrib() {
    if (!publicKey || !project) return;
    setContribLoading(true);
    try {
      const readOnlyWallet = {
        publicKey,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      };
      const provider = new AnchorProvider(connection, readOnlyWallet as any, { commitment: "confirmed" });
      const program = getProgram(provider);
      const pid = BigInt(project.projectId);
      const [contributionPda] = getContributionPda(pid, publicKey);
      try {
        const contrib = await program.account["contribution"].fetch(contributionPda);
        const c = contrib as any;
        setOnChainContrib({
          tokensAllocated: Number(c.tokensAllocated) / 1_000_000,
          claimed: c.claimed,
        });
      } catch {
        setOnChainContrib(null);
      }
    } finally {
      setContribLoading(false);
    }
  }

  const handleVote = async () => {
    if (!publicKey || !signTransaction || !signAllTransactions || !project) return;
    setActionStatus("loading");
    setActionError("");

    try {
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction, signAllTransactions },
        { commitment: "confirmed" }
      );
      const program = getProgram(provider);
      const pid = BigInt(project.projectId);
      const [projectPda] = getProjectPda(pid);
      const [votePda] = getVotePda(pid, publicKey);

      await (program.methods as any)
        .castSocialVote()
        .accounts({
          project: projectPda,
          socialVote: votePda,
          voter: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setHasVoted(true);
      setActionStatus("success");
      fetchProject();
    } catch (e: any) {
      setActionError(e.message || "Error voting");
      setActionStatus("error");
    }
  };

  const handleContribute = async () => {
    if (!publicKey || !signTransaction || !signAllTransactions || !project) return;
    setActionStatus("loading");
    setActionError("");

    try {
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction, signAllTransactions },
        { commitment: "confirmed" }
      );
      const program = getProgram(provider);
      const [platformPda] = getPlatformPda();
      const pid = BigInt(project.projectId);
      const [projectPda] = getProjectPda(pid);
      const [contributionPda] = getContributionPda(pid, publicKey);
      const [vaultPda] = getVaultPda(pid);

      const platformData = await program.account["platform"].fetch(platformPda);
      const treasury = (platformData as any).treasury;

      const amountLamports = Math.floor(
        (contributionUsd / SOL_PRICE_USD) * LAMPORTS_PER_SOL
      );

      await (program.methods as any)
        .contribute(new BN(amountLamports))
        .accounts({
          platform: platformPda,
          project: projectPda,
          contribution: contributionPda,
          vault: vaultPda,
          treasury,
          contributor: publicKey,
          priceFeed: PYTH_FEED,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setHasContributed(true);
      setActionStatus("success");
      fetchProject();
    } catch (e: any) {
      setActionError(e.message || "Error contributing");
      setActionStatus("error");
    }
  };

  const handleGraduate = async () => {
    if (!publicKey || !signTransaction || !signAllTransactions || !project) return;
    setGraduateLoading(true);
    setGraduateError("");
    try {
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction, signAllTransactions },
        { commitment: "confirmed" }
      );
      const program = getProgram(provider);
      const pid = BigInt(project.projectId);
      const [projectPda] = getProjectPda(pid);
      const [vaultPda] = getVaultPda(pid);

      await (program.methods as any)
        .graduateProject()
        .accounts({
          project: projectPda,
          vault: vaultPda,
          priceFeed: PYTH_FEED,
          caller: publicKey,
        })
        .rpc();

      setGraduateSuccess(true);
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "finalize", projectId: project.projectId }),
      });
      fetchProject();
    } catch (e: any) {
      const msg: string = e?.message ?? e?.toString() ?? "";
      if (msg.includes("GraduationNotAvailableYet")) {
        setGraduateError("Graduation conditions not yet met (need Day 180+, 1,000 holders, and $100K raised)");
      } else {
        setGraduateError(msg || "Error graduating project");
      }
    } finally {
      setGraduateLoading(false);
    }
  };

  const handleClaimTokens = async () => {
    if (!publicKey || !signTransaction || !signAllTransactions || !project) return;
    setClaimLoading(true);
    setClaimError("");
    try {
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction, signAllTransactions },
        { commitment: "confirmed" }
      );
      const program = getProgram(provider);
      const pid = BigInt(project.projectId);
      const [projectPda] = getProjectPda(pid);
      const [contributionPda] = getContributionPda(pid, publicKey);
      const tokenMint = new PublicKey(project.tokenMint);
      const contributorTokenAccount = getAssociatedTokenAddressSync(tokenMint, publicKey);

      await (program.methods as any)
        .claimTokens()
        .accounts({
          project: projectPda,
          contribution: contributionPda,
          tokenMint,
          contributorTokenAccount,
          contributor: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setClaimSuccess(true);
      setOnChainContrib((prev) => (prev ? { ...prev, claimed: true } : null));
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "finalize", projectId: project.projectId }),
      });
    } catch (e: any) {
      setClaimError(e?.message ?? "Error claiming tokens");
    } finally {
      setClaimLoading(false);
    }
  };

  if (loading) return <LoadingPage />;
  if (!project) return <NotFound />;

  const deadline =
    project.state === "SOCIAL_VOTING"
      ? new Date(new Date(project.socialVoteStart).getTime() + SOCIAL_VOTE_DURATION_MS)
      : project.state === "ECONOMIC_PHASE" && project.economicPhaseStart
      ? new Date(new Date(project.economicPhaseStart).getTime() + ECONOMIC_PHASE_DURATION_MS)
      : null;

  const fundingProgress =
    Number(project.totalRaised) > 0
      ? (Number(project.totalRaised) / Number(project.raiseGoal)) * 100
      : 0;

  const holderProgress = Math.min((Number(project.holderCount) / 1000) * 100, 100);
  const maxContributionUsd = lamportsToUsd(BigInt(project.raiseGoal)) * 0.001;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <a href="/" className="text-xs text-quorum-muted hover:text-quorum-text font-display">
            ← Projects
          </a>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-quorum-border flex items-center justify-center font-display text-lg font-bold text-quorum-green">
              {project.ticker.slice(0, 2)}
            </div>
            <div>
              <h1 className="font-body text-2xl font-bold">{project.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-quorum-muted font-display text-sm">
                  ${project.ticker}
                </span>
                <span className={`badge ${PROJECT_STATE_COLORS[project.state]}`}>
                  {PROJECT_STATE_LABELS[project.state]}
                </span>
                {project.devLocked && (
                  <span className="badge text-quorum-red border-quorum-red bg-quorum-red-dim">
                    ⚠️ Dev inactive
                  </span>
                )}
              </div>
            </div>
          </div>

          {deadline && (
            <div className="text-right">
              <p className="text-xs text-quorum-muted font-display">Time remaining</p>
              <p className="font-display text-lg text-quorum-amber">
                {timeRemaining(deadline)}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="md:col-span-2 space-y-6">
          <div className="card">
            <h2 className="font-display text-xs text-quorum-muted tracking-widest uppercase mb-3">
              Description
            </h2>
            <p className="text-quorum-text text-sm leading-relaxed">
              {project.description}
            </p>
            {project.websiteUrl && (
              <a
                href={project.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-3 text-xs text-quorum-green hover:underline font-display"
              >
                {project.websiteUrl} ↗
              </a>
            )}
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="stat-card">
              <span className="text-2xl font-display font-medium">
                {formatNumber(Number(project.holderCount))}
              </span>
              <span className="text-xs text-quorum-muted font-display tracking-wider uppercase">
                Holders
              </span>
              <div className="h-1 bg-quorum-border rounded mt-2">
                <div
                  className="h-full bg-quorum-green rounded transition-all"
                  style={{ width: `${holderProgress}%` }}
                />
              </div>
              <span className="text-xs text-quorum-muted font-display">
                {holderProgress.toFixed(1)}% of minimum (1,000)
              </span>
            </div>

            <div className="stat-card">
              <span className="text-2xl font-display font-medium">
                {formatUsd(lamportsToUsd(BigInt(project.totalRaised)))}
              </span>
              <span className="text-xs text-quorum-muted font-display tracking-wider uppercase">
                Raised
              </span>
              <div className="h-1 bg-quorum-border rounded mt-2">
                <div
                  className="h-full bg-blue-400 rounded transition-all"
                  style={{ width: `${Math.min(fundingProgress, 100)}%` }}
                />
              </div>
              <span className="text-xs text-quorum-muted font-display">
                Goal: {formatUsd(lamportsToUsd(BigInt(project.raiseGoal)))}
              </span>
            </div>

            <div className="stat-card">
              <span className="text-2xl font-display font-medium text-quorum-amber">
                {formatNumber(Number(project.socialVotes))}
              </span>
              <span className="text-xs text-quorum-muted font-display tracking-wider uppercase">
                Social Votes
              </span>
            </div>

            <div className="stat-card">
              <span className="text-2xl font-display font-medium">
                {project.vestingEnd
                  ? timeRemaining(new Date(project.vestingEnd))
                  : "9 months"}
              </span>
              <span className="text-xs text-quorum-muted font-display tracking-wider uppercase">
                Vesting remaining
              </span>
            </div>
          </div>

          {/* On-chain parameters */}
          <div className="card">
            <h2 className="font-display text-xs text-quorum-muted tracking-widest uppercase mb-3">
              On-chain Parameters
            </h2>
            <div className="space-y-2">
              {[
                ["Holder limit", "0.1% of supply"],
                ["Minimum holders", "1,000"],
                ["Raise goal", formatUsd(lamportsToUsd(BigInt(project.raiseGoal)))],
                ["Vesting", "9 months, fully locked"],
                ["Platform fee", "0.1% already collected"],
                ["Dev wallet", `${project.devWallet.slice(0, 8)}...${project.devWallet.slice(-8)}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-quorum-muted font-display">{k}</span>
                  <span className="text-quorum-text font-display">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action panel */}
        <div className="space-y-4">
          {project.state === "SOCIAL_VOTING" && (
            <ActionPanel
              title="Phase 1: Social Voting"
              description="Vote if you believe this project has real utility. No money at stake."
              color="amber"
            >
              {hasVoted ? (
                <div className="text-center py-4">
                  <p className="text-quorum-green font-display text-sm">✓ Vote recorded</p>
                </div>
              ) : (
                <button
                  className="btn-primary w-full"
                  onClick={handleVote}
                  disabled={!publicKey || actionStatus === "loading"}
                >
                  {actionStatus === "loading" ? "Recording..." : "Vote for this project"}
                </button>
              )}
            </ActionPanel>
          )}

          {project.state === "ECONOMIC_PHASE" && (
            <>
              <ActionPanel
                title="Phase 2: Contribute"
                description={`Max $${maxContributionUsd.toFixed(2)} USD per wallet (0.1% of supply).`}
                color="blue"
              >
                <div className="space-y-3">
                  <div>
                    <label className="label">Amount (USD)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-quorum-muted font-display text-sm">$</span>
                      <input
                        className="input pl-8"
                        type="number"
                        min={1}
                        max={maxContributionUsd}
                        value={contributionUsd}
                        onChange={(e) => setContributionUsd(Number(e.target.value))}
                      />
                    </div>
                    <p className="text-xs text-quorum-muted mt-1 font-display">
                      ≈ {(contributionUsd / SOL_PRICE_USD).toFixed(4)} SOL
                    </p>
                  </div>

                  <div className="bg-quorum-bg border border-quorum-border rounded-lg p-3 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-quorum-muted">Platform fee (0.1%)</span>
                      <span className="font-display">${(contributionUsd * 0.001).toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-quorum-muted">Net to project</span>
                      <span className="font-display text-quorum-green">${(contributionUsd * 0.999).toFixed(4)}</span>
                    </div>
                  </div>

                  {hasContributed ? (
                    <div className="text-center py-2">
                      <p className="text-quorum-green font-display text-sm">✓ Contribution recorded</p>
                    </div>
                  ) : (
                    <button
                      className="btn-primary w-full"
                      onClick={handleContribute}
                      disabled={
                        !publicKey ||
                        actionStatus === "loading" ||
                        contributionUsd < 1 ||
                        contributionUsd > maxContributionUsd
                      }
                    >
                      {actionStatus === "loading" ? "Processing..." : `Contribute $${contributionUsd}`}
                    </button>
                  )}
                </div>
              </ActionPanel>

              <ActionPanel
                title="Graduate Project"
                description="Available after Day 180 once 1,000 holders and $100K raised are met. Anyone can trigger graduation."
                color="green"
              >
                {graduateSuccess ? (
                  <p className="text-quorum-green font-display text-xs text-center py-2">✓ Project graduated</p>
                ) : (
                  <>
                    <button
                      className="btn-primary w-full"
                      onClick={handleGraduate}
                      disabled={!publicKey || graduateLoading}
                    >
                      {graduateLoading ? "Processing..." : "Graduate Project"}
                    </button>
                    {graduateError && (
                      <p className="text-xs text-quorum-amber mt-2 font-display">{graduateError}</p>
                    )}
                  </>
                )}
              </ActionPanel>
            </>
          )}

          {project.state === "VESTING" && (
            <div className="card border-quorum-green/20 bg-quorum-green-dim">
              <h3 className="font-display text-xs text-quorum-green tracking-widest uppercase mb-2">
                Vesting Active
              </h3>
              <p className="text-sm text-quorum-text">
                Project successfully funded. Dev and holders are in vesting until{" "}
                {project.vestingEnd
                  ? new Date(project.vestingEnd).toLocaleDateString("en-US")
                  : "—"}
                .
              </p>
            </div>
          )}

          {project.state === "GRADUATED" && (
            <>
              <div className="card border-purple-400/20 bg-purple-400/5">
                <h3 className="font-display text-xs text-purple-400 tracking-widest uppercase mb-2">
                  Graduated
                </h3>
                <p className="text-sm text-quorum-text">
                  This project met all community requirements and graduated. Tokens are available to claim.
                </p>
              </div>

              {publicKey && (
                <div className="card">
                  <h3 className="font-display text-xs text-quorum-muted tracking-widest uppercase mb-3">
                    Claim Tokens
                  </h3>
                  {contribLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-5 h-5 border-2 border-quorum-green border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : onChainContrib ? (
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-quorum-muted font-display">Tokens allocated</span>
                        <span className="font-display text-quorum-green">
                          {onChainContrib.tokensAllocated.toLocaleString()} {project.ticker}
                        </span>
                      </div>
                      {onChainContrib.claimed || claimSuccess ? (
                        <p className="text-xs text-quorum-green font-display text-center py-2">✓ Tokens claimed</p>
                      ) : (
                        <>
                          <button
                            className="btn-primary w-full"
                            onClick={handleClaimTokens}
                            disabled={claimLoading}
                          >
                            {claimLoading
                              ? "Claiming..."
                              : `Claim ${onChainContrib.tokensAllocated.toLocaleString()} ${project.ticker}`}
                          </button>
                          {claimError && (
                            <p className="text-xs text-quorum-red mt-2 font-display">{claimError}</p>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-quorum-muted font-display text-center py-2">
                      No contribution found for this wallet
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {project.state === "FAILED" && (
            <div className="card border-quorum-red/20 bg-quorum-red-dim">
              <h3 className="font-display text-xs text-quorum-red tracking-widest uppercase mb-2">
                Project Failed
              </h3>
              <p className="text-sm text-quorum-text mb-4">
                The project did not meet the minimum requirements. If you contributed,
                you can claim your refund.
              </p>
              <button className="btn-secondary w-full text-quorum-red border-quorum-red">
                Claim Refund
              </button>
            </div>
          )}

          {actionError && (
            <div className="p-3 bg-quorum-red-dim border border-quorum-red rounded-lg">
              <p className="text-xs text-quorum-red font-display">{actionError}</p>
            </div>
          )}

          {actionStatus === "success" && !hasVoted && !hasContributed && (
            <div className="p-3 bg-quorum-green-dim border border-quorum-green rounded-lg">
              <p className="text-xs text-quorum-green font-display">✓ Transaction successful</p>
            </div>
          )}

          {/* Why Quorum */}
          <div className="card">
            <h3 className="font-display text-xs text-quorum-muted tracking-widest uppercase mb-3">
              Why Quorum?
            </h3>
            <ul className="space-y-2">
              {[
                "No rugpull possible for 9 months",
                "Dev can't sell either",
                "Price rises through adoption, not speculation",
                "If it fails, you get 99% back automatically",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-quorum-muted">
                  <span className="text-quorum-green mt-0.5">→</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionPanel({
  title,
  description,
  color,
  children,
}: {
  title: string;
  description: string;
  color: "amber" | "blue" | "green";
  children: React.ReactNode;
}) {
  const colors = {
    amber: "text-quorum-amber border-quorum-amber/20",
    blue: "text-blue-400 border-blue-400/20",
    green: "text-quorum-green border-quorum-green/20",
  };

  return (
    <div className={`card ${colors[color]}`}>
      <h3 className={`font-display text-xs tracking-widest uppercase mb-1 ${colors[color].split(" ")[0]}`}>
        {title}
      </h3>
      <p className="text-xs text-quorum-muted mb-4">{description}</p>
      {children}
    </div>
  );
}

function LoadingPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-24 text-center">
      <div className="w-8 h-8 border-2 border-quorum-green border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-24 text-center">
      <p className="text-quorum-muted">Project not found.</p>
      <a href="/" className="btn-primary inline-block mt-4">← Back</a>
    </div>
  );
}
