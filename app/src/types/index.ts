export type ProjectState =
  | "SOCIAL_VOTING"
  | "ECONOMIC_PHASE"
  | "VESTING"
  | "FAILED"
  | "GRADUATED";

export interface Project {
  id: string;
  projectId: string;
  devWallet: string;
  tokenMint: string;
  projectPda: string;
  name: string;
  ticker: string;
  description: string;
  websiteUrl: string;
  state: ProjectState;
  socialVoteStart: string;
  socialVotes: string;
  economicPhaseStart: string | null;
  raiseGoal: string;
  totalRaised: string;
  holderCount: string;
  platformFeePaid: string;
  vestingStart: string | null;
  vestingEnd: string | null;
  lastDevActivity: string;
  devLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Contribution {
  id: string;
  projectId: string;
  contributorWallet: string;
  amountLamports: string;
  tokensAllocated: string;
  claimed: boolean;
  refunded: boolean;
  contributedAt: string;
}

export interface CreateProjectForm {
  name: string;
  ticker: string;
  description: string;
  websiteUrl: string;
  raiseGoalUsd: number;
}

export interface HealthCheck {
  checkNumber: 1 | 2;
  totalRaised: string;
  targetAmount: string;
  holderCount: string;
  onTrack: boolean;
  checkedAt: string;
}
