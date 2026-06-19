import { PublicKey } from "@solana/web3.js";

// ── Programa ──────────────────────────────────────────────────
export const PROGRAM_ID = new PublicKey(
  "J9o5cuQAkeCWAfGsnE2qxRNAM1hbXCo7MTLxqyjecm1y"
);

// ── Branding ──────────────────────────────────────────────────
export const SITE_NAME = "Quorum";
export const SITE_TAGLINE = "The rug-proof launchpad.";
export const SITE_DOMAIN = "quorumbuild.xyz";
export const TWITTER_HANDLE = "@QuorumBuild";
export const TWITTER_URL = "https://x.com/QuorumBuild";

// ── Seeds PDA ─────────────────────────────────────────────────
export const PLATFORM_SEED = Buffer.from("platform");
export const PROJECT_SEED = Buffer.from("project");
export const CONTRIBUTION_SEED = Buffer.from("contribution");
export const VOTE_SEED = Buffer.from("vote");
export const VAULT_SEED = Buffer.from("vault");

// ── Parámetros del protocolo ──────────────────────────────────
export const PLATFORM_FEE_BPS = 10;        // 0.1%
export const MAX_HOLDER_BPS = 10;          // 0.1% del supply
export const MIN_HOLDERS = 1_000;
export const TOKEN_SUPPLY = 1_000_000_000_000_000n; // 1B × 10^6
export const TOKEN_DECIMALS = 6;

// Mínimo de recaudación: $100,000 USD equiv.
// A SOL $150 → 666.67 SOL → 666_666_667_000 lamports
export const MIN_RAISE_LAMPORTS = 666_666_667_000n;

// Mínimo de contribución: $1 USD equiv.
// A SOL $150 → 0.00667 SOL → 6_666_667 lamports
export const MIN_CONTRIBUTION_LAMPORTS = 6_666_667n;

// ── Tiempos del protocolo (ms para frontend) ──────────────────
// Fase Social: Día 1 al Día 30
export const SOCIAL_VOTE_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

// Fase Económica abre: Día 15 (en paralelo con la social)
export const ECONOMIC_PHASE_OPEN_DAY_MS = 15 * 24 * 60 * 60 * 1000;

// Fase Económica duración: 270 días desde el Día 15 (= Día 284)
export const ECONOMIC_PHASE_DURATION_MS = 270 * 24 * 60 * 60 * 1000;

// Vesting: igual que la fase económica (empieza en Día 15, termina en Día 284)
export const VESTING_DURATION_MS = 270 * 24 * 60 * 60 * 1000;

// Health checks (desde apertura de fase económica)
export const HEALTH_CHECK_1_MS = 90 * 24 * 60 * 60 * 1000;   // Mes 3
export const HEALTH_CHECK_2_MS = 180 * 24 * 60 * 60 * 1000;  // Mes 6

// ── Red ───────────────────────────────────────────────────────
export const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.devnet.solana.com";

// ── Precio SOL (actualizar o usar oráculo en producción) ──────
export const SOL_PRICE_USD = 150;
export const LAMPORTS_PER_SOL = 1_000_000_000;

// ── Helpers de conversión ─────────────────────────────────────
export function lamportsToUsd(lamports: bigint | number): number {
  const sol = Number(lamports) / LAMPORTS_PER_SOL;
  return sol * SOL_PRICE_USD;
}

export function lamportsToSol(lamports: bigint | number): number {
  return Number(lamports) / LAMPORTS_PER_SOL;
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number | bigint): string {
  return new Intl.NumberFormat("en-US").format(Number(n));
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function timeRemaining(deadline: Date): string {
  const diff = deadline.getTime() - Date.now();
  if (diff <= 0) return "Terminado";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m`;
}

// ── Labels y colores de estado ────────────────────────────────
export const PROJECT_STATE_LABELS: Record<string, string> = {
  SOCIAL_VOTING:  "Votación Social",
  ECONOMIC_PHASE: "Fondeo Activo",
  VESTING:        "Vesting Activo",
  FAILED:         "Reembolso",
  GRADUATED:      "Graduado",
};

export const PROJECT_STATE_COLORS: Record<string, string> = {
  SOCIAL_VOTING:  "text-quorum-amber border-quorum-amber bg-quorum-amber-dim",
  ECONOMIC_PHASE: "text-blue-400 border-blue-400 bg-blue-400/10",
  VESTING:        "text-quorum-green border-quorum-green bg-quorum-green-dim",
  FAILED:         "text-quorum-red border-quorum-red bg-quorum-red-dim",
  GRADUATED:      "text-purple-400 border-purple-400 bg-purple-400/10",
};

// ── Descripción del ciclo para la UI ─────────────────────────
export const PROTOCOL_TIMELINE = [
  { day: "Día 1",   label: "Votación social abre",               color: "amber" },
  { day: "Día 15",  label: "Fondeo abre + Vesting inicia",       color: "blue"  },
  { day: "Mes 3",   label: "Indicador de salud público",         color: "muted" },
  { day: "Mes 6",   label: "Indicador de salud — alerta riesgo", color: "muted" },
  { day: "Día 284", label: "Graduación o reembolso 99%",         color: "green" },
];
