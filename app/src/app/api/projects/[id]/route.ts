import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = BigInt(params.id);

    const project = await prisma.project.findUnique({
      where: { projectId },
      include: {
        contributions: {
          orderBy: { contributedAt: "desc" },
          take: 10,
        },
        socialVoteRecords: {
          orderBy: { votedAt: "desc" },
          take: 5,
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const serialized = {
      ...project,
      projectId: project.projectId.toString(),
      socialVotes: project.socialVotes.toString(),
      raiseGoal: project.raiseGoal.toString(),
      totalRaised: project.totalRaised.toString(),
      holderCount: project.holderCount.toString(),
      platformFeePaid: project.platformFeePaid.toString(),
      socialVoteStart: project.socialVoteStart.toISOString(),
      economicPhaseStart: project.economicPhaseStart?.toISOString() ?? null,
      vestingStart: project.vestingStart?.toISOString() ?? null,
      vestingEnd: project.vestingEnd?.toISOString() ?? null,
      lastDevActivity: project.lastDevActivity.toISOString(),
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      contributions: project.contributions.map((c) => ({
        ...c,
        projectId: c.projectId.toString(),
        amountLamports: c.amountLamports.toString(),
        tokensAllocated: c.tokensAllocated.toString(),
        contributedAt: c.contributedAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
    };

    return NextResponse.json(serialized);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Error fetching project" },
      { status: 500 }
    );
  }
}
