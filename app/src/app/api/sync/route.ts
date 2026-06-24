import { NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";
import { makeReadonlyProgram, syncLatestProject, syncProject, syncAllProjects, syncVote } from "@/lib/sync";
import { RPC_ENDPOINT } from "@/lib/constants";

// POST /api/sync — manual on-chain → DB sync, called by frontend after each tx
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, projectId } = body;

    const program = makeReadonlyProgram();
    const connection = new Connection(RPC_ENDPOINT, "confirmed");

    switch (type) {
      case "create_project":
        await syncLatestProject(program, connection);
        break;

      case "social_vote":
        // Atomic DB increment — avoids RPC propagation lag that causes
        // syncProject to read socialVotes=0 immediately after confirmation.
        // The Helius webhook reconciles with chain truth via syncProject later.
        if (projectId !== undefined) {
          await syncVote(BigInt(projectId));
        }
        break;

      case "contribute":
      case "finalize":
        if (projectId !== undefined) {
          await syncProject(program, BigInt(projectId));
        }
        break;

      default:
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
