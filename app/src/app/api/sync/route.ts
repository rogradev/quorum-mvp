import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { getProgram, getPlatformPda, getProjectPda, QUORUM_IDL } from "@/lib/anchor";
import { RPC_ENDPOINT } from "@/lib/constants";
import { Keypair } from "@solana/web3.js";

// POST /api/sync — sincroniza estado on-chain con la DB
// Llamado por el frontend después de cada transacción exitosa
// En producción, esto sería un webhook de Helius
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { txSignature, type, projectId } = body;

    const connection = new Connection(RPC_ENDPOINT, "confirmed");

    // Crear un provider de solo lectura (no necesita firmar)
    const dummyWallet = {
      publicKey: Keypair.generate().publicKey,
      signTransaction: async (tx: any) => tx,
      signAllTransactions: async (txs: any[]) => txs,
    };

    const provider = new AnchorProvider(connection, dummyWallet as any, {
      commitment: "confirmed",
    });

    const program = getProgram(provider);

    switch (type) {
      case "create_project":
        await syncLatestProject(program, connection);
        break;

      case "social_vote":
      case "contribute":
      case "finalize":
        if (projectId !== undefined) {
          await syncProject(program, BigInt(projectId));
        }
        break;

      default:
        // Sync completo — costoso, solo en mantenimiento
        await syncAllProjects(program, connection);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Error en sincronización" },
      { status: 500 }
    );
  }
}

async function syncLatestProject(program: Program, connection: Connection) {
  const [platformPda] = getPlatformPda();

  try {
    const platform = await program.account["platform"].fetch(platformPda);
    const totalProjects = Number((platform as any).totalProjects);

    if (totalProjects === 0) return;

    // Sincronizar el último proyecto creado
    await syncProject(program, BigInt(totalProjects - 1));
  } catch (e) {
    console.error("Error syncing latest project:", e);
  }
}

async function syncProject(program: Program, projectId: bigint) {
  const [projectPda] = getProjectPda(projectId);

  try {
    const onChain = await program.account["project"].fetch(projectPda);
    const p = onChain as any;

    // Mapear estado del enum on-chain
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
        economicPhaseStart:
          Number(p.economicPhaseStart) > 0
            ? new Date(Number(p.economicPhaseStart) * 1000)
            : null,
        raiseGoal: BigInt(p.raiseGoal.toString()),
        totalRaised: BigInt(p.totalRaised.toString()),
        holderCount: BigInt(p.holderCount.toString()),
        platformFeePaid: BigInt(p.platformFeePaid.toString()),
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
        economicPhaseStart:
          Number(p.economicPhaseStart) > 0
            ? new Date(Number(p.economicPhaseStart) * 1000)
            : null,
        totalRaised: BigInt(p.totalRaised.toString()),
        holderCount: BigInt(p.holderCount.toString()),
        platformFeePaid: BigInt(p.platformFeePaid.toString()),
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

async function syncAllProjects(program: Program, connection: Connection) {
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
