import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import { PROGRAM_ID, RPC_ENDPOINT } from "./constants";

// El IDL se genera automáticamente al compilar el programa con `anchor build`
// Importar desde target/idl/quorum.json después del primer build
// Por ahora usamos una versión simplificada para development
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
      args: [
        {
          name: "params",
          type: {
            defined: "CreateProjectParams",
          },
        },
      ],
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
      name: "advanceToEconomic",
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
          { name: "socialVoteStart", type: "i64" },
          { name: "socialVotes", type: "u64" },
          { name: "economicPhaseStart", type: "i64" },
          { name: "raiseGoal", type: "u64" },
          { name: "totalRaised", type: "u64" },
          { name: "holderCount", type: "u64" },
          { name: "platformFeePaid", type: "u64" },
          { name: "vestingStart", type: "i64" },
          { name: "vestingEnd", type: "i64" },
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
