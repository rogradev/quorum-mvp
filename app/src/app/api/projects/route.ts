import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/projects — lista todos los proyectos
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state");
    const limit = parseInt(searchParams.get("limit") || "50");

    const projects = await prisma.project.findMany({
      where: state ? { state: state as any } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Serializar BigInt a string para JSON
    const serialized = projects.map((p) => ({
      ...p,
      projectId: p.projectId.toString(),
      socialVotes: p.socialVotes.toString(),
      raiseGoal: p.raiseGoal.toString(),
      totalRaised: p.totalRaised.toString(),
      holderCount: p.holderCount.toString(),
      platformFeePaid: p.platformFeePaid.toString(),
      socialVoteStart: p.socialVoteStart.toISOString(),
      economicPhaseStart: p.economicPhaseStart?.toISOString() ?? null,
      vestingStart: p.vestingStart?.toISOString() ?? null,
      vestingEnd: p.vestingEnd?.toISOString() ?? null,
      lastDevActivity: p.lastDevActivity.toISOString(),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Error al obtener proyectos" },
      { status: 500 }
    );
  }
}
