"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { getProgram, getPlatformPda, getProjectPda, getVotePda, getContributionPda, getVaultPda } from "@/lib/anchor";
import {
  PROJECT_STATE_LABELS,
  PROJECT_STATE_COLORS,
  lamportsToUsd,
  lamportsToSol,
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

  useEffect(() => {
    fetchProject();
  }, [projectId]);

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

      await program.methods
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
      setActionError(e.message || "Error al votar");
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

      // Obtener treasury de la plataforma
      const platformData = await program.account["platform"].fetch(platformPda);
      const treasury = (platformData as any).treasury;

      const amountLamports = Math.floor(
        (contributionUsd / SOL_PRICE_USD) * LAMPORTS_PER_SOL
      );

      await program.methods
        .contribute(new BN(amountLamports))
        .accounts({
          platform: platformPda,
          project: projectPda,
          contribution: contributionPda,
          projectVault: vaultPda,
          treasury,
          contributor: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setHasContributed(true);
      setActionStatus("success");
      fetchProject();
    } catch (e: any) {
      setActionError(e.message || "Error al contribuir");
      setActionStatus("error");
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

  const holderProgress = Math.min(
    (Number(project.holderCount) / 1000) * 100,
    100
  );

  const maxContributionUsd =
    lamportsToUsd(BigInt(project.raiseGoal)) * 0.001;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Header del proyecto */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <a href="/" className="text-xs text-quorum-muted hover:text-quorum-text font-display">
            ← Proyectos
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
                    ⚠️ Dev inactivo
                  </span>
                )}
              </div>
            </div>
          </div>

          {deadline && (
            <div className="text-right">
              <p className="text-xs text-quorum-muted font-display">Tiempo restante</p>
              <p className="font-display text-lg text-quorum-amber">
                {timeRemaining(deadline)}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="md:col-span-2 space-y-6">
          {/* Descripción */}
          <div className="card">
            <h2 className="font-display text-xs text-quorum-muted tracking-widest uppercase mb-3">
              Descripción
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

          {/* Métricas */}
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
                {holderProgress.toFixed(1)}% del mínimo (1,000)
              </span>
            </div>

            <div className="stat-card">
              <span className="text-2xl font-display font-medium">
                {formatUsd(lamportsToUsd(BigInt(project.totalRaised)))}
              </span>
              <span className="text-xs text-quorum-muted font-display tracking-wider uppercase">
                Recaudado
              </span>
              <div className="h-1 bg-quorum-border rounded mt-2">
                <div
                  className="h-full bg-blue-400 rounded transition-all"
                  style={{ width: `${Math.min(fundingProgress, 100)}%` }}
                />
              </div>
              <span className="text-xs text-quorum-muted font-display">
                Meta: {formatUsd(lamportsToUsd(BigInt(project.raiseGoal)))}
              </span>
            </div>

            <div className="stat-card">
              <span className="text-2xl font-display font-medium text-quorum-amber">
                {formatNumber(Number(project.socialVotes))}
              </span>
              <span className="text-xs text-quorum-muted font-display tracking-wider uppercase">
                Votos Sociales
              </span>
            </div>

            <div className="stat-card">
              <span className="text-2xl font-display font-medium">
                {project.vestingEnd
                  ? timeRemaining(new Date(project.vestingEnd))
                  : "9 meses"}
              </span>
              <span className="text-xs text-quorum-muted font-display tracking-wider uppercase">
                Vesting restante
              </span>
            </div>
          </div>

          {/* Reglas del protocolo aplicadas */}
          <div className="card">
            <h2 className="font-display text-xs text-quorum-muted tracking-widest uppercase mb-3">
              Parámetros on-chain
            </h2>
            <div className="space-y-2">
              {[
                ["Límite por holder", "0.1% del supply"],
                ["Holders mínimos", "1,000"],
                ["Meta de recaudación", formatUsd(lamportsToUsd(BigInt(project.raiseGoal)))],
                ["Vesting", "9 meses, bloqueo total"],
                ["Fee de plataforma", "0.1% ya cobrado"],
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

        {/* Panel de acción */}
        <div className="space-y-4">
          {project.state === "SOCIAL_VOTING" && (
            <ActionPanel
              title="Fase 1: Votación Social"
              description="Vota si crees que este proyecto tiene utilidad real. Sin dinero en juego."
              color="amber"
            >
              {hasVoted ? (
                <div className="text-center py-4">
                  <p className="text-quorum-green font-display text-sm">✓ Voto registrado</p>
                </div>
              ) : (
                <button
                  className="btn-primary w-full"
                  onClick={handleVote}
                  disabled={!publicKey || actionStatus === "loading"}
                >
                  {actionStatus === "loading" ? "Registrando..." : "Votar por este proyecto"}
                </button>
              )}
            </ActionPanel>
          )}

          {project.state === "ECONOMIC_PHASE" && (
            <ActionPanel
              title="Fase 2: Contribuir"
              description={`Máximo $${maxContributionUsd.toFixed(2)} USD por wallet (0.1% del supply).`}
              color="blue"
            >
              <div className="space-y-3">
                <div>
                  <label className="label">Monto (USD)</label>
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
                    <span className="text-quorum-muted">Fee plataforma (0.1%)</span>
                    <span className="font-display">${(contributionUsd * 0.001).toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-quorum-muted">Neto al proyecto</span>
                    <span className="font-display text-quorum-green">${(contributionUsd * 0.999).toFixed(4)}</span>
                  </div>
                </div>

                {hasContributed ? (
                  <div className="text-center py-2">
                    <p className="text-quorum-green font-display text-sm">✓ Contribución registrada</p>
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
                    {actionStatus === "loading" ? "Procesando..." : `Contribuir $${contributionUsd}`}
                  </button>
                )}
              </div>
            </ActionPanel>
          )}

          {project.state === "VESTING" && (
            <div className="card border-quorum-green/20 bg-quorum-green-dim">
              <h3 className="font-display text-xs text-quorum-green tracking-widest uppercase mb-2">
                Vesting Activo
              </h3>
              <p className="text-sm text-quorum-text">
                El proyecto fue fondeo exitosamente. Dev y holders están en
                vesting hasta{" "}
                {project.vestingEnd
                  ? new Date(project.vestingEnd).toLocaleDateString("es-ES")
                  : "—"}
                .
              </p>
            </div>
          )}

          {project.state === "FAILED" && (
            <div className="card border-quorum-red/20 bg-quorum-red-dim">
              <h3 className="font-display text-xs text-quorum-red tracking-widest uppercase mb-2">
                Proyecto Fallido
              </h3>
              <p className="text-sm text-quorum-text mb-4">
                El proyecto no alcanzó los requisitos mínimos. Si contribuiste,
                puedes reclamar tu reembolso.
              </p>
              <button className="btn-secondary w-full text-quorum-red border-quorum-red">
                Reclamar Reembolso
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
              <p className="text-xs text-quorum-green font-display">✓ Operación exitosa</p>
            </div>
          )}

          {/* Info del protocolo */}
          <div className="card">
            <h3 className="font-display text-xs text-quorum-muted tracking-widest uppercase mb-3">
              ¿Por qué Quorum?
            </h3>
            <ul className="space-y-2">
              {[
                "Sin rugpull posible durante 9 meses",
                "El dev tampoco puede vender",
                "El precio sube por adopción, no especulación",
                "Si falla, recuperas el 99% automáticamente",
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
      <p className="text-quorum-muted">Proyecto no encontrado.</p>
      <a href="/" className="btn-primary inline-block mt-4">← Volver</a>
    </div>
  );
}
