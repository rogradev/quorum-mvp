import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import type { Quorum } from "./quorum_types";
import IDL from "./quorum_idl.json";
import { PROGRAM_ID, RPC_ENDPOINT } from "./constants";

export const QUORUM_IDL = IDL;

// Pyth SOL/USD feed — devnet
export const PYTH_FEED = new PublicKey(
  "J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"
);

export function getConnection(): Connection {
  return new Connection(RPC_ENDPOINT, "confirmed");
}

export function getProgram(provider: AnchorProvider): Program<Quorum> {
  return new Program(IDL as unknown as Quorum, provider);
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

export async function getOrCreateContributorAta(
  mint: PublicKey,
  owner: PublicKey
): Promise<PublicKey> {
  const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
  return getAssociatedTokenAddressSync(mint, owner);
}
