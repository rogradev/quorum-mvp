"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getProgram, getPlatformPda, getProjectPda } from "@/lib/anchor";
import { SOL_PRICE_USD } from "@/lib/constants";

const MIN_RAISE_USD = 100_000; // $100,000 minimum — matches MIN_RAISE_LAMPORTS on-chain

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

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [txSig, setTxSig] = useState<string>("");
  const [error, setError] = useState<string>("");

  const raiseGoalLamports = Math.floor(
    (form.raiseGoalUsd / SOL_PRICE_USD) * LAMPORTS_PER_SOL
  );

  const handleSubmit = async () => {
    if (!publicKey || !signTransaction || !signAllTransactions) {
      setError("Conecta tu wallet primero");
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

      // Obtener el project ID actual
      const platform = await program.account["platform"].fetch(platformPda);
      const projectId = (platform as any).totalProjects as bigint;

      const [projectPda] = getProjectPda(projectId);
      const tokenMint = Keypair.generate();

      const tx = await program.methods
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

      // Sincronizar con la DB vía API
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txSignature: tx, type: "create_project" }),
      });
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error al crear el proyecto");
      setStatus("error");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="mb-10">
        <h1 className="font-body text-3xl font-bold mb-2">Lanzar Proyecto</h1>
        <p className="text-quorum-muted text-sm">
          Tu proyecto será validado por la comunidad antes de que nadie ponga un
          centavo. Rellena la información con honestidad — es tu primera señal.
        </p>
      </div>

      {/* Reglas del protocolo */}
      <div className="card border-quorum-green/20 bg-quorum-green-dim mb-8">
        <h3 className="font-display text-xs text-quorum-green tracking-widest uppercase mb-3">
          Reglas del Protocolo
        </h3>
        <ul className="space-y-1.5">
          {[
            "Fase 1: 30 días de votación social (sin capital en juego)",
            "Fase 2: 270 días de contribuciones — mínimo 1,000 holders",
            "Cada holder puede tener máximo 0.1% del supply",
            "Vesting bilateral de 9 meses — dev y holders bloqueados",
            "La plataforma retiene 0.1% del total recaudado",
            "Si no se alcanza la meta → 99% devuelto automáticamente",
          ].map((rule) => (
            <li key={rule} className="flex items-start gap-2 text-xs text-quorum-text">
              <span className="text-quorum-green mt-0.5">✓</span>
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* Formulario */}
      {!publicKey ? (
        <div className="card text-center py-12 border-dashed">
          <p className="text-quorum-muted mb-4">
            Conecta tu wallet para continuar
          </p>
        </div>
      ) : status === "success" ? (
        <SuccessState txSig={txSig} />
      ) : (
        <div className="space-y-6">
          <div>
            <label className="label">Nombre del Proyecto *</label>
            <input
              className="input"
              placeholder="Ej: Quorum Finance"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={64}
            />
          </div>

          <div>
            <label className="label">Ticker *</label>
            <input
              className="input"
              placeholder="Ej: QRMD"
              value={form.ticker}
              onChange={(e) =>
                setForm({ ...form, ticker: e.target.value.toUpperCase() })
              }
              maxLength={10}
            />
            <p className="text-xs text-quorum-muted mt-1 font-display">
              Máximo 10 caracteres. Se convierte a mayúsculas automáticamente.
            </p>
          </div>

          <div>
            <label className="label">Descripción de la Utilidad *</label>
            <textarea
              className="input min-h-[120px] resize-none"
              placeholder="Explica qué hace tu proyecto, qué problema resuelve y por qué es útil para la comunidad..."
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              maxLength={512}
            />
            <p className="text-xs text-quorum-muted mt-1 font-display">
              {form.description.length}/512 caracteres
            </p>
          </div>

          <div>
            <label className="label">Sitio Web o Repositorio</label>
            <input
              className="input"
              placeholder="https://tu-proyecto.com o https://github.com/..."
              value={form.websiteUrl}
              onChange={(e) =>
                setForm({ ...form, websiteUrl: e.target.value })
              }
              maxLength={128}
            />
          </div>

          <div>
            <label className="label">Meta de Recaudación (USD)</label>
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
                  setForm({
                    ...form,
                    raiseGoalUsd: Number(e.target.value),
                  })
                }
              />
            </div>
            <p className="text-xs text-quorum-muted mt-1 font-display">
              Mínimo ${MIN_RAISE_USD} USD. Equivale a ≈{" "}
              {(raiseGoalLamports / LAMPORTS_PER_SOL).toFixed(2)} SOL.
            </p>

            {/* Preview de distribución */}
            <div className="mt-3 p-4 bg-quorum-bg border border-quorum-border rounded-lg space-y-2">
              <p className="text-xs text-quorum-muted font-display tracking-wider uppercase">
                Con tu meta de ${form.raiseGoalUsd}:
              </p>
              <div className="flex justify-between text-xs">
                <span className="text-quorum-muted">Fee de plataforma (0.1%)</span>
                <span className="font-display text-quorum-text">
                  ${(form.raiseGoalUsd * 0.001).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-quorum-muted">Fondos netos al proyecto</span>
                <span className="font-display text-quorum-green">
                  ${(form.raiseGoalUsd * 0.999).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-quorum-muted">Max por holder (0.1%)</span>
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
                Creando proyecto...
              </span>
            ) : (
              "Crear Proyecto y Empezar Votación Social →"
            )}
          </button>

          <p className="text-xs text-center text-quorum-muted font-display">
            Al crear el proyecto, aceptas que tu wallet quedará asociada públicamente
            a este proyecto on-chain.
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
        ¡Proyecto creado!
      </h3>
      <p className="text-quorum-muted text-sm mb-6">
        La votación social ha comenzado. Tienes 30 días para que la comunidad
        valide tu propuesta.
      </p>
      <div className="bg-quorum-bg border border-quorum-border rounded-lg p-3 mb-6">
        <p className="text-xs text-quorum-muted font-display mb-1">Transacción</p>
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
        Ver todos los proyectos
      </a>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
    >
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
