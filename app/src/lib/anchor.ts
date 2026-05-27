import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import { PROGRAM_ID, RPC_ENDPOINT } from "./constants";

// IDL temporal para development — se reemplaza con target/idl/quorum.json tras anchor build
// IMPORTANTE: después de `anchor build`, copiar target/idl/quorum.json aquí
export const QUORUM_IDL = {
  address: PROGRAM_ID.toString(),
  metadata: { name: "quorum", version: "0.1.0" },
  instructions: [
    {
      name: "initializePlatform",
      accounts: [
        { name: "platform", isMut: true, isSigner: false },
        { name: "authority", isMut: true, isSigner: true },
        { name: "treasury", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: "createProject",
      accounts: [
        { name: "platform", isMut: true, isSigner: false },
        { name: "project", isMut: true, isSigner: false },
        { name: "tokenMint", isMut: true, isSigner: true },
        { name: "dev", isMut: true, isSigner: true },
        { name: "tokenProgram", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
        { name: "rent", isMut: false, isSigner: false },
      ],
      args: [{ name: "params", type: { defined: "CreateProjectParams" } }],
    },
    {
      name: "castSocialVote",
      accounts: [
        { name: "project", isMut: true, isSigner: false },
        { name: "socialVote", isMut: true, isSigner: false },
        { name: "voter", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      // Abre la fase económica al Día 15 — en paralelo con la social
      name: "openEconomicPhase",
      accounts: [
        { name: "project", isMut: true, isSigner: false },
        { name: "caller", isMut: false, isSigner: true },
      ],
      args: [],
    },
    {
      // Cierra la fase social al Día 30
      name: "closeSocialPhase",
      accounts: [
        { name: "project", isMut: true, isSigner: false },
        { name: "caller", isMut: false, isSigner: true },
      ],
      args: [],
    },
    {
      name: "contribute",
      accounts: [
        { name: "platform", isMut: true, isSigner: false },
        { name: "project", isMut: true, isSigner: false },
        { name: "contribution", isMut: true, isSigner: false },
        { name: "projectVault", isMut: true, isSigner: false },
        { name: "treasury", isMut: true, isSigner: false },
        { name: "contributor", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [{ name: "amountLamports", type: "u64" }],
    },
    {
      // Emite indicadores de salud — Mes 3 y Mes 6
      name: "emitHealthCheck",
      accounts: [
        { name: "project", isMut: true, isSigner: false },
        { name: "caller", isMut: false, isSigner: true },
      ],
      args: [],
    },
    {
      // Evaluación final al Día 284 — graduación o reembolso
      name: "finalizeFunding",
      accounts: [
        { name: "project", isMut: true, isSigner: false },
        { name: "caller", isMut: false, isSigner: true },
      ],
      args: [],
    },
    {
      name: "refund",
      accounts: [
        { name: "project", isMut: false, isSigner: false },
        { name: "contribution", isMut: true, isSigner: false },
        { name: "projectVault", isMut: true, isSigner: false },
        { name: "contributor", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: "registerDevActivity",
      accounts: [
        { name: "project", isMut: true, isSigner: false },
        { name: "dev", isMut: false, isSigner: true },
      ],
      args: [],
    },
    {
      name: "triggerInactivity",
      accounts: [
        { name: "project", isMut: true, isSigner: false },
        { name: "caller", isMut: false, isSigner: true },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "Platform",
      type: {
        kind: "struct",
        fields: [
          { name: "authority", type: "publicKey" },
          { name: "treasury", type: "publicKey" },
          { name: "totalProjects", type: "u64" },
          { name: "totalFeesCollected", type: "u64" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "Project",
      type: {
        kind: "struct",
        fields: [
          { name: "dev", type: "publicKey" },
          { name: "tokenMint", type: "publicKey" },
          { name: "projectId", type: "u64" },
          { name: "name", type: "string" },
          { name: "ticker", type: "string" },
          { name: "description", type: "string" },
          { name: "websiteUrl", type: "string" },
          { name: "state", type: { defined: "ProjectState" } },
          // Fase 1 — Votación social (Día 1-30)
          { name: "socialVoteStart", type: "i64" },
          { name: "socialVotes", type: "u64" },
          // Fase 2 — Económica (abre Día 15, cierra Día 284)
          { name: "economicPhaseActive", type: "bool" },
          { name: "economicPhaseOpen", type: "i64" },
          { name: "raiseGoal", type: "u64" },
          { name: "totalRaised", type: "u64" },
          { name: "holderCount", type: "u64" },
          { name: "platformFeePaid", type: "u64" },
          // Health checks trimestrales
          { name: "healthCheck1Emitted", type: "bool" },
          { name: "healthCheck2Emitted", type: "bool" },
          // Vesting bilateral (Día 15 al Día 284)
          { name: "vestingStart", type: "i64" },
          { name: "vestingEnd", type: "i64" },
          // Inactividad del dev
          { name: "lastDevActivity", type: "i64" },
          { name: "devLocked", type: "bool" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "Contribution",
      type: {
        kind: "struct",
        fields: [
          { name: "projectId", type: "u64" },
          { name: "contributor", type: "publicKey" },
          { name: "amountLamports", type: "u64" },
          { name: "tokensAllocated", type: "u64" },
          { name: "claimed", type: "bool" },
          { name: "refunded", type: "bool" },
          { name: "contributedAt", type: "i64" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "SocialVote",
      type: {
        kind: "struct",
        fields: [
          { name: "projectId", type: "u64" },
          { name: "voter", type: "publicKey" },
          { name: "votedAt", type: "i64" },
          { name: "bump", type: "u8" },
        ],
      },
    },
  ],
  types: [
    {
      name: "CreateProjectParams",
      type: {
        kind: "struct",
        fields: [
          { name: "name", type: "string" },
          { name: "ticker", type: "string" },
          { name: "description", type: "string" },
          { name: "websiteUrl", type: "string" },
          { name: "raiseGoal", type: "u64" },
        ],
      },
    },
    {
      name: "ProjectState",
      type: {
        kind: "enum",
        variants: [
          { name: "SocialVoting" },
          { name: "EconomicPhase" },
          { name: "Vesting" },
          { name: "Failed" },
          { name: "Graduated" },
        ],
      },
    },
  ],
  errors: [],
} as unknown as Idl;

export function getConnection(): Connection {
  return new Connection(RPC_ENDPOINT, "confirmed");
}

export function getProgram(provider: AnchorProvider): Program {
  return new Program(QUORUM_IDL, provider);
}

export function getPlatformPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("platform")],
    PROGRAM_ID
  );
}

export function getProjectPda(projectId: bigint): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(projectId);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("project"), buf],
    PROGRAM_ID
  );
}

export function getContributionPda(
  projectId: bigint,
  contributor: PublicKey
): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(projectId);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("contribution"), buf, contributor.toBuffer()],
    PROGRAM_ID
  );
}

export function getVotePda(
  projectId: bigint,
  voter: PublicKey
): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(projectId);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vote"), buf, voter.toBuffer()],
    PROGRAM_ID
  );
}

export function getVaultPda(projectId: bigint): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(projectId);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), buf],
    PROGRAM_ID
  );
}

// PDAs para las nuevas instrucciones
export function getOpenEconomicPhasePda(projectId: bigint): [PublicKey, number] {
  return getProjectPda(projectId); // misma cuenta de proyecto
}
