import { prisma } from "@/lib/db";
import {
  PROJECT_STATE_LABELS,
  PROJECT_STATE_COLORS,
  lamportsToUsd,
  formatUsd,
  formatNumber,
  timeRemaining,
  SOCIAL_VOTE_DURATION_MS,
  ECONOMIC_PHASE_DURATION_MS,
  TWITTER_URL,
} from "@/lib/constants";
import { Project } from "@/types";

async function getProjects(): Promise<Project[]> {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return projects.map((p) => ({
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
  } catch {
    return [];
  }
}

function getDeadline(project: Project): Date | null {
  if (project.state === "SOCIAL_VOTING" && project.socialVoteStart) {
    return new Date(
      new Date(project.socialVoteStart).getTime() + SOCIAL_VOTE_DURATION_MS
    );
  }
  if (project.state === "ECONOMIC_PHASE" && project.economicPhaseStart) {
    return new Date(
      new Date(project.economicPhaseStart).getTime() + ECONOMIC_PHASE_DURATION_MS
    );
  }
  return null;
}

export default async function HomePage() {
  const projects = await getProjects();

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Hero */}
      <div className="mb-16 animate-fade-in">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-quorum-green animate-pulse-green" />
          <span className="text-xs text-quorum-muted font-display tracking-widest uppercase">
            Live on devnet
          </span>
        </div>
        <h1 className="font-body text-5xl font-bold leading-tight mb-4">
          Tokens with{" "}
          <span className="text-quorum-green">intention.</span>
          <br />
          Community as filter.
        </h1>
        <p className="text-quorum-muted text-lg max-w-2xl leading-relaxed">
          Quorum is the launchpad where community validates before anyone funds.
          Bilateral 9-month vesting. 0.1% holder limit. No rugs by design.
        </p>

        <div className="flex gap-4 mt-8">
          <a href="/launch" className="btn-primary">
            Launch Project →
          </a>
          <a href="#how-it-works" className="btn-secondary">
            How it works
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {[
          { label: "Projects", value: formatNumber(projects.length) },
          {
            label: "In Vesting",
            value: formatNumber(
              projects.filter((p) => p.state === "VESTING").length
            ),
          },
          {
            label: "Total Holders",
            value: formatNumber(
              projects.reduce((acc, p) => acc + Number(p.holderCount), 0)
            ),
          },
          {
            label: "Total Raised",
            value: formatUsd(
              projects.reduce(
                (acc, p) => acc + lamportsToUsd(BigInt(p.totalRaised)),
                0
              )
            ),
          },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <span className="text-2xl font-display font-medium text-quorum-text">
              {stat.value}
            </span>
            <span className="text-xs text-quorum-muted font-display tracking-wider uppercase">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div id="how-it-works" className="mb-16">
        <h2 className="font-display text-xs text-quorum-muted tracking-widest uppercase mb-8">
          The protocol in 3 steps
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "Social Validation",
              subtitle: "Day 1 — Day 30",
              desc: "Any wallet votes on project utility. 30 days. No money at stake. Pure signal of genuine interest.",
              color: "text-quorum-amber",
            },
            {
              step: "02",
              title: "Funding Open",
              subtitle: "Day 15 — Day 284",
              desc: "Opens at Day 15 in parallel with social voting. Min $1 per wallet. Max 0.1% of supply. Funding stays open for 270 days.",
              color: "text-blue-400",
            },
            {
              step: "03",
              title: "Graduate or Refund",
              subtitle: "Day 284",
              desc: "$100K raised + 1,000 unique holders → graduation to Raydium. Miss either target → 99% auto-refunded on-chain.",
              color: "text-quorum-green",
            },
          ].map((item) => (
            <div key={item.step} className="card relative overflow-hidden">
              <div className="absolute top-4 right-4 font-display text-4xl font-bold text-quorum-border">
                {item.step}
              </div>
              <h3 className={`font-display text-sm font-medium ${item.color} mb-1`}>
                {item.title}
              </h3>
              <p className={`font-display text-xs ${item.color} opacity-70 mb-3`}>
                {item.subtitle}
              </p>
              <p className="text-quorum-muted text-sm leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Project list */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xs text-quorum-muted tracking-widest uppercase">
            Active Projects
          </h2>
        </div>

        {projects.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const deadline = getDeadline(project);
  const progress =
    project.state === "ECONOMIC_PHASE" || project.state === "VESTING"
      ? (Number(project.totalRaised) / Number(project.raiseGoal)) * 100
      : 0;

  const holderProgress = (Number(project.holderCount) / 1000) * 100;

  return (
    <a
      href={`/project/${project.projectId}`}
      className="card hover:border-quorum-green/30 transition-colors group animate-slide-up block"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-quorum-border flex items-center justify-center font-display text-xs font-bold text-quorum-green">
            {project.ticker.slice(0, 2)}
          </div>
          <div>
            <h3 className="font-body font-semibold text-sm group-hover:text-quorum-green transition-colors">
              {project.name}
            </h3>
            <span className="text-xs text-quorum-muted font-display">
              ${project.ticker}
            </span>
          </div>
        </div>
        <span className={`badge ${PROJECT_STATE_COLORS[project.state]}`}>
          {PROJECT_STATE_LABELS[project.state]}
        </span>
      </div>

      <p className="text-quorum-muted text-xs leading-relaxed mb-4 line-clamp-2">
        {project.description}
      </p>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-quorum-muted font-display">Holders</span>
            <span className="font-display text-quorum-text">
              {formatNumber(Number(project.holderCount))} / 1,000
            </span>
          </div>
          <div className="h-1.5 bg-quorum-border rounded-full overflow-hidden">
            <div
              className="h-full bg-quorum-green rounded-full transition-all"
              style={{ width: `${Math.min(holderProgress, 100)}%` }}
            />
          </div>
        </div>

        {(project.state === "ECONOMIC_PHASE" ||
          project.state === "VESTING" ||
          project.state === "GRADUATED") && (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-quorum-muted font-display">Raised</span>
              <span className="font-display text-quorum-text">
                {formatUsd(lamportsToUsd(BigInt(project.totalRaised)))} /{" "}
                {formatUsd(lamportsToUsd(BigInt(project.raiseGoal)))}
              </span>
            </div>
            <div className="h-1.5 bg-quorum-border rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}

        {project.state === "SOCIAL_VOTING" && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-quorum-muted font-display">Social votes</span>
            <span className="font-display text-quorum-amber">
              {formatNumber(Number(project.socialVotes))} votes
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-quorum-border">
        <span className="text-xs text-quorum-muted font-display">
          Dev: {project.devWallet.slice(0, 4)}...{project.devWallet.slice(-4)}
        </span>
        {deadline && (
          <span className="text-xs text-quorum-muted font-display">
            ⏱ {timeRemaining(deadline)}
          </span>
        )}
        {project.devLocked && (
          <span className="badge text-quorum-red border-quorum-red bg-quorum-red-dim">
            ⚠️ Dev inactive
          </span>
        )}
      </div>
    </a>
  );
}

function EmptyState() {
  return (
    <div className="card text-center py-24 border-dashed">
      <div className="w-16 h-16 rounded-2xl bg-quorum-border mx-auto mb-6 flex items-center justify-center">
        <span className="text-2xl">🌱</span>
      </div>
      <h3 className="font-body font-semibold mb-2">No projects yet</h3>
      <p className="text-quorum-muted text-sm mb-6">
        Be the first to launch a token with real intention.
      </p>
      <a href="/launch" className="btn-primary inline-block">
        Launch first project →
      </a>
    </div>
  );
}
