import { Connection, Keypair } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import type { Program } from "@coral-xyz/anchor";
import type { Quorum } from "@/lib/quorum_types";
import { prisma } from "@/lib/db";
import { getProgram, getPlatformPda, getProjectPda } from "@/lib/anchor";
import { RPC_ENDPOINT } from "@/lib/constants";

export function makeReadonlyProgram(): Program<Quorum> {
  const connection = new Connection(RPC_ENDPOINT, "confirmed");
  const dummyWallet = {
    publicKey: Keypair.generate().publicKey,
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  };
  const provider = new AnchorProvider(connection, dummyWallet as any, {
    commitment: "confirmed",
  });
  return getProgram(provider);
}

export async function syncLatestProject(program: Program<Quorum>, connection: Connection) {
  const [platformPda] = getPlatformPda();
  try {
    const platform = await program.account["platform"].fetch(platformPda);
    const totalProjects = Number((platform as any).totalProjects);
    if (totalProjects === 0) return;
    await syncProject(program, BigInt(totalProjects - 1));
  } catch (e) {
    console.error("Error syncing latest project:", e);
  }
}

export async function syncProject(program: Program<Quorum>, projectId: bigint) {
  const [projectPda] = getProjectPda(projectId);

  try {
    const onChain = await program.account["project"].fetch(projectPda);
    const p = onChain as any;

    const stateKey = Object.keys(p.state)[0];
    const stateMap: Record<string, string> = {
      socialVoting: "SOCIAL_VOTING",
      economicPhase: "ECONOMIC_PHASE",
      vesting: "VESTING",
      failed: "FAILED",
      graduated: "GRADUATED",
    };
    const state = stateMap[stateKey] || "SOCIAL_VOTING";

    await prisma.project.upsert({
      where: { projectId },
      create: {
        projectId,
        devWallet: p.dev.toString(),
        tokenMint: p.tokenMint.toString(),
        projectPda: projectPda.toString(),
        name: p.name,
        ticker: p.ticker,
        description: p.description,
        websiteUrl: p.websiteUrl,
        state: state as any,
        socialVoteStart: new Date(Number(p.socialVoteStart) * 1000),
        socialVotes: BigInt(p.socialVotes.toString()),
        economicPhaseActive: p.economicPhaseActive,
        economicPhaseStart:
          Number(p.economicPhaseOpen) > 0
            ? new Date(Number(p.economicPhaseOpen) * 1000)
            : null,
        raiseGoal: BigInt(p.raiseGoal.toString()),
        totalRaised: BigInt(p.totalRaised.toString()),
        holderCount: BigInt(p.holderCount.toString()),
        platformFeePaid: BigInt(p.platformFeePaid.toString()),
        healthCheck1Emitted: p.healthCheck1Emitted,
        healthCheck2Emitted: p.healthCheck2Emitted,
        vestingStart:
          Number(p.vestingStart) > 0
            ? new Date(Number(p.vestingStart) * 1000)
            : null,
        vestingEnd:
          Number(p.vestingEnd) > 0
            ? new Date(Number(p.vestingEnd) * 1000)
            : null,
        lastDevActivity: new Date(Number(p.lastDevActivity) * 1000),
        devLocked: p.devLocked,
      },
      update: {
        state: state as any,
        socialVotes: BigInt(p.socialVotes.toString()),
        economicPhaseActive: p.economicPhaseActive,
        economicPhaseStart:
          Number(p.economicPhaseOpen) > 0
            ? new Date(Number(p.economicPhaseOpen) * 1000)
            : null,
        totalRaised: BigInt(p.totalRaised.toString()),
        holderCount: BigInt(p.holderCount.toString()),
        platformFeePaid: BigInt(p.platformFeePaid.toString()),
        healthCheck1Emitted: p.healthCheck1Emitted,
        healthCheck2Emitted: p.healthCheck2Emitted,
        vestingStart:
          Number(p.vestingStart) > 0
            ? new Date(Number(p.vestingStart) * 1000)
            : null,
        vestingEnd:
          Number(p.vestingEnd) > 0
            ? new Date(Number(p.vestingEnd) * 1000)
            : null,
        lastDevActivity: new Date(Number(p.lastDevActivity) * 1000),
        devLocked: p.devLocked,
      },
    });

    console.log(`✅ Synced project ${projectId}`);
  } catch (e) {
    console.error(`Error syncing project ${projectId}:`, e);
  }
}

// Increment socialVotes in the DB without an RPC round-trip.
// Used for immediate frontend feedback after castSocialVote; the Helius
// webhook later reconciles with chain truth via syncProject.
export async function syncVote(projectId: bigint) {
  try {
    await prisma.project.update({
      where: { projectId },
      data: { socialVotes: { increment: 1n } },
    });
  } catch (e) {
    console.error(`Error incrementing vote for project ${projectId}:`, e);
  }
}

export async function syncAllProjects(program: Program<Quorum>, connection: Connection) {
  const [platformPda] = getPlatformPda();
  try {
    const platform = await program.account["platform"].fetch(platformPda);
    const totalProjects = Number((platform as any).totalProjects);
    for (let i = 0; i < totalProjects; i++) {
      await syncProject(program, BigInt(i));
    }
  } catch (e) {
    console.error("Error in full sync:", e);
  }
}
