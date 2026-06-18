import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

export type Quorum = {
  "address": "DVxHFqsi2zgxvMLGjmtEBBPJ8o4dFBVWtdSHt77sMMrk",
  "metadata": {
    "name": "quorum",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Quorum Protocol - Community-validated token launchpad"
  },
  "instructions": [
    {
      "name": "cast_social_vote",
      "discriminator": [116, 205, 135, 19, 196, 133, 190, 1],
      "accounts": [
        { "name": "project", "writable": true },
        { "name": "social_vote", "writable": true },
        { "name": "voter", "writable": true, "signer": true },
        { "name": "system_program", "address": "11111111111111111111111111111111" },
      ],
      "args": [
      ]
    },
    {
      "name": "close_social_phase",
      "discriminator": [99, 35, 159, 172, 168, 80, 12, 44],
      "accounts": [
        { "name": "project", "writable": true },
        { "name": "caller", "signer": true },
      ],
      "args": [
      ]
    },
    {
      "name": "contribute",
      "discriminator": [82, 33, 68, 131, 32, 0, 205, 95],
      "accounts": [
        { "name": "platform", "writable": true },
        { "name": "project", "writable": true },
        { "name": "contribution", "writable": true },
        { "name": "vault", "writable": true },
        { "name": "treasury", "writable": true },
        { "name": "contributor", "writable": true, "signer": true },
        { "name": "price_feed" },
        { "name": "system_program", "address": "11111111111111111111111111111111" },
      ],
      "args": [
        { "name": "amount_lamports", "type": "u64" },
      ]
    },
    {
      "name": "create_project",
      "discriminator": [148, 219, 181, 42, 221, 114, 145, 190],
      "accounts": [
        { "name": "platform", "writable": true },
        { "name": "project", "writable": true },
        { "name": "vault", "writable": true },
        { "name": "token_mint", "writable": true, "signer": true },
        { "name": "dev", "writable": true, "signer": true },
        { "name": "token_program", "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { "name": "system_program", "address": "11111111111111111111111111111111" },
        { "name": "rent", "address": "SysvarRent111111111111111111111111111111111" },
      ],
      "args": [
        { "name": "params", "type": {"defined": {"name": "CreateProjectParams"}} },
      ]
    },
    {
      "name": "emit_health_check",
      "discriminator": [185, 42, 207, 133, 218, 123, 79, 236],
      "accounts": [
        { "name": "project", "writable": true },
        { "name": "price_feed" },
        { "name": "caller", "signer": true },
      ],
      "args": [
      ]
    },
    {
      "name": "finalize_funding",
      "discriminator": [129, 81, 184, 191, 58, 224, 149, 90],
      "accounts": [
        { "name": "project", "writable": true },
        { "name": "caller", "signer": true },
      ],
      "args": [
      ]
    },
    {
      "name": "graduate_project",
      "discriminator": [139, 31, 196, 69, 35, 71, 19, 149],
      "accounts": [
        { "name": "project", "writable": true },
        { "name": "vault" },
        { "name": "price_feed" },
        { "name": "caller", "signer": true },
      ],
      "args": [
      ]
    },
    {
      "name": "initialize_platform",
      "discriminator": [119, 201, 101, 45, 75, 122, 89, 3],
      "accounts": [
        { "name": "platform", "writable": true },
        { "name": "authority", "writable": true, "signer": true },
        { "name": "treasury" },
        { "name": "system_program", "address": "11111111111111111111111111111111" },
      ],
      "args": [
      ]
    },
    {
      "name": "open_economic_phase",
      "discriminator": [104, 154, 241, 150, 253, 178, 67, 162],
      "accounts": [
        { "name": "project", "writable": true },
        { "name": "caller", "signer": true },
      ],
      "args": [
      ]
    },
    {
      "name": "refund",
      "discriminator": [2, 96, 183, 251, 63, 208, 46, 46],
      "accounts": [
        { "name": "project" },
        { "name": "contribution", "writable": true },
        { "name": "vault", "writable": true },
        { "name": "contributor", "writable": true, "signer": true },
        { "name": "system_program", "address": "11111111111111111111111111111111" },
      ],
      "args": [
      ]
    },
    {
      "name": "register_dev_activity",
      "discriminator": [104, 13, 253, 28, 22, 110, 255, 222],
      "accounts": [
        { "name": "project", "writable": true },
        { "name": "dev", "signer": true },
      ],
      "args": [
      ]
    },
    {
      "name": "trigger_inactivity",
      "discriminator": [126, 106, 29, 137, 218, 194, 245, 8],
      "accounts": [
        { "name": "project", "writable": true },
        { "name": "caller", "signer": true },
      ],
      "args": [
      ]
    },
    {
      "name": "close_vault",
      "discriminator": [141, 103, 17, 126, 72, 75, 29, 29],
      "accounts": [
        { "name": "project" },
        { "name": "vault", "writable": true },
        { "name": "caller", "writable": true, "signer": true },
      ],
      "args": [
      ]
    },
    {
      "name": "claim_tokens",
      "discriminator": [108, 216, 210, 231, 0, 212, 42, 64],
      "accounts": [
        { "name": "project" },
        { "name": "contribution", "writable": true },
        { "name": "token_mint", "writable": true },
        { "name": "contributor_token_account", "writable": true },
        { "name": "contributor", "writable": true, "signer": true },
        { "name": "token_program", "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { "name": "associated_token_program", "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bC8" },
        { "name": "system_program", "address": "11111111111111111111111111111111" },
      ],
      "args": [
      ]
    },
  ],
  "accounts": [
    { "name": "Contribution", "discriminator": [182, 187, 14, 111, 72, 167, 242, 212] },
    { "name": "Platform", "discriminator": [77, 92, 204, 58, 187, 98, 91, 12] },
    { "name": "Project", "discriminator": [205, 168, 189, 202, 181, 247, 142, 19] },
    { "name": "SocialVote", "discriminator": [86, 111, 34, 197, 71, 130, 73, 33] },
    { "name": "VaultAccount", "discriminator": [230, 251, 241, 83, 139, 202, 93, 28] },
  ],
  "events": [
    { "name": "ContributionMade", "discriminator": [81, 218, 72, 109, 93, 96, 131, 199] },
    { "name": "DevActivityRegistered", "discriminator": [146, 166, 133, 240, 133, 60, 92, 188] },
    { "name": "DevLocked", "discriminator": [151, 208, 132, 226, 166, 33, 92, 220] },
    { "name": "EconomicPhaseOpened", "discriminator": [224, 234, 153, 176, 180, 211, 172, 168] },
    { "name": "FundingFailed", "discriminator": [157, 28, 229, 25, 248, 253, 183, 60] },
    { "name": "HealthCheckEmitted", "discriminator": [174, 200, 191, 198, 137, 209, 28, 104] },
    { "name": "ProjectCreated", "discriminator": [192, 10, 163, 29, 185, 31, 67, 168] },
    { "name": "SocialPhaseClosed", "discriminator": [201, 198, 244, 154, 105, 253, 24, 219] },
    { "name": "SocialVoteCast", "discriminator": [86, 85, 140, 142, 181, 237, 5, 119] },
    { "name": "RefundProcessed", "discriminator": [203, 88, 236, 233, 192, 178, 57, 161] },
    { "name": "VaultClosed", "discriminator": [238, 129, 38, 228, 227, 118, 249, 215] },
    { "name": "TokensClaimed", "discriminator": [25, 128, 244, 55, 241, 136, 200, 91] },
    { "name": "GraduationCompleted", "discriminator": [194, 201, 196, 1, 19, 204, 8, 1] },
    { "name": "HoldersGoalReached", "discriminator": [126, 58, 186, 10, 117, 248, 38, 2] },
    { "name": "RaiseGoalReached", "discriminator": [214, 17, 239, 140, 151, 185, 85, 134] },
    { "name": "GraduationAvailable", "discriminator": [139, 237, 204, 69, 1, 7, 143, 112] },
  ],
  "errors": [
    { "code": 6000, "name": "EmptyName", "msg": "El nombre del proyecto no puede estar vacío" },
    { "code": 6001, "name": "EmptyTicker", "msg": "El ticker no puede estar vacío" },
    { "code": 6002, "name": "EmptyDescription", "msg": "La descripción no puede estar vacía" },
    { "code": 6003, "name": "RaiseTooLow", "msg": "La meta de recaudación es demasiado baja (mínimo $100,000 USD equivalente)" },
    { "code": 6004, "name": "SocialVoteNotActive", "msg": "La fase de votación social no está activa" },
    { "code": 6005, "name": "AlreadyVoted", "msg": "Ya votaste en este proyecto" },
    { "code": 6006, "name": "SocialVoteNotEnded", "msg": "La fase de votación social no ha terminado" },
    { "code": 6007, "name": "EconomicPhaseNotActive", "msg": "La fase económica no está activa" },
    { "code": 6008, "name": "EconomicPhaseNotEnded", "msg": "La fase económica no ha terminado" },
    { "code": 6009, "name": "ContributionTooLow", "msg": "La contribución mínima es $1 USD equivalente" },
    { "code": 6010, "name": "ExceedsHolderLimit", "msg": "Esta contribución excede el límite de 0.1% del supply por holder" },
    { "code": 6011, "name": "AlreadyContributed", "msg": "Ya contribuiste en este proyecto" },
    { "code": 6012, "name": "NotEnoughHolders", "msg": "El proyecto no alcanzó el mínimo de holders requeridos (1,000)" },
    { "code": 6013, "name": "NotEnoughFunds", "msg": "El proyecto no alcanzó la meta de recaudación mínima" },
    { "code": 6014, "name": "AlreadyFinalized", "msg": "El proyecto ya fue finalizado" },
    { "code": 6015, "name": "NotFinalized", "msg": "El proyecto aún no fue finalizado" },
    { "code": 6016, "name": "VestingNotComplete", "msg": "El vesting aún no ha terminado" },
    { "code": 6017, "name": "VestingAlreadyClaimed", "msg": "El vesting ya fue reclamado" },
    { "code": 6018, "name": "NothingToRefund", "msg": "No hay fondos para reembolsar" },
    { "code": 6019, "name": "ProjectSucceeded", "msg": "El proyecto fue exitoso, no hay reembolso disponible" },
    { "code": 6020, "name": "UnauthorizedActivityUpdate", "msg": "Solo el dev puede registrar actividad" },
    { "code": 6021, "name": "DevLocked", "msg": "El dev está bloqueado por inactividad" },
    { "code": 6022, "name": "ArithmeticOverflow", "msg": "Overflow aritmético" },
    { "code": 6023, "name": "InvalidProjectState", "msg": "El proyecto no existe en el estado esperado" },
    { "code": 6024, "name": "Unauthorized", "msg": "Solo el administrador de la plataforma puede ejecutar esto" },
    { "code": 6025, "name": "VaultProjectMismatch", "msg": "El vault no pertenece a este proyecto" },
    { "code": 6026, "name": "VaultNotFullyRefunded", "msg": "Quedan reembolsos pendientes — el vault no se puede cerrar todavía" },
    { "code": 6027, "name": "InsufficientVaultBalance", "msg": "El vault no tiene saldo suficiente para cubrir el reembolso" },
    { "code": 6028, "name": "InvalidPriceFeed", "msg": "La cuenta del price feed de Pyth no es válida" },
    { "code": 6029, "name": "StalePriceFeed", "msg": "El precio de Pyth está desactualizado (más de 60 segundos)" },
    { "code": 6030, "name": "PriceOutOfRange", "msg": "El precio de SOL está fuera del rango permitido ($1–$10,000)" },
    { "code": 6031, "name": "GraduationNotAvailableYet", "msg": "Graduación no disponible aún (antes del Día 180 desde apertura económica, o condiciones no cumplidas)" },
    { "code": 6032, "name": "GraduationWindowExpired", "msg": "La ventana de graduación expiró (después del Día 284) — usa finalize_funding" },
  ],
  "types": []
};

// ── Account types ─────────────────────────────────────────

export type Contribution = {
  projectId: BN;
  contributor: PublicKey;
  amountLamports: BN;
  tokensAllocated: BN;
  claimed: boolean;
  refunded: boolean;
  contributedAt: BN;
  solPriceAtContribution: BN;
  refundedAt: BN;
  bump: number;
};

export type ContributionMade = {
  projectId: BN;
  contributor: PublicKey;
  amountLamports: BN;
  tokensAllocated: BN;
  totalRaised: BN;
  holderCount: BN;
  platformFee: BN;
  solPriceUsd: BN;
};

export type CreateProjectParams = {
  name: string;
  ticker: string;
  description: string;
  websiteUrl: string;
  raiseGoal: BN;
};

export type DevActivityRegistered = {
  projectId: BN;
  dev: PublicKey;
  timestamp: BN;
};

export type DevLocked = {
  projectId: BN;
  dev: PublicKey;
  inactiveForDays: BN;
};

export type EconomicPhaseOpened = {
  projectId: BN;
  openedAt: BN;
  vestingEnd: BN;
  socialVotesAtOpening: BN;
};

export type FundingFailed = {
  projectId: BN;
  totalRaised: BN;
  holderCount: BN;
  failedAt: BN;
};

export type HealthCheckEmitted = {
  projectId: BN;
  checkNumber: number;
  totalRaised: BN;
  targetAmount: BN;
  holderCount: BN;
  onTrack: boolean;
  checkedAt: BN;
};

export type Platform = {
  authority: PublicKey;
  treasury: PublicKey;
  totalProjects: BN;
  totalFeesCollected: BN;
  bump: number;
};

export type Project = {
  dev: PublicKey;
  tokenMint: PublicKey;
  projectId: BN;
  name: string;
  ticker: string;
  description: string;
  websiteUrl: string;
  state: ProjectState;
  socialVoteStart: BN;
  socialVotes: BN;
  economicPhaseActive: boolean;
  economicPhaseOpen: BN;
  raiseGoal: BN;
  totalRaised: BN;
  holderCount: BN;
  platformFeePaid: BN;
  healthCheck1Emitted: boolean;
  healthCheck2Emitted: boolean;
  holdersGoalEmitted: boolean;
  raiseGoalEmitted: boolean;
  graduationAvailableEmitted: boolean;
  vestingStart: BN;
  vestingEnd: BN;
  lastDevActivity: BN;
  devLocked: boolean;
  bump: number;
};

export type ProjectCreated = {
  projectId: BN;
  dev: PublicKey;
  name: string;
  ticker: string;
  raiseGoal: BN;
  socialVoteStart: BN;
};

export type SocialPhaseClosed = {
  projectId: BN;
  finalVotes: BN;
  closedAt: BN;
  economicPhaseActive: boolean;
};

export type SocialVote = {
  projectId: BN;
  voter: PublicKey;
  votedAt: BN;
  bump: number;
};

export type SocialVoteCast = {
  projectId: BN;
  voter: PublicKey;
  totalVotes: BN;
};

export type VaultAccount = {
  project: PublicKey;
  totalReceived: BN;
  totalRefunded: BN;
  bump: number;
};

export type RefundProcessed = {
  projectId: BN;
  contributor: PublicKey;
  refundAmount: BN;
  refundedAt: BN;
  vaultTotalRefunded: BN;
  vaultTotalReceived: BN;
};

export type VaultClosed = {
  projectId: BN;
  totalReceived: BN;
  totalRefunded: BN;
  closedBy: PublicKey;
};

export type TokensClaimed = {
  projectId: BN;
  contributor: PublicKey;
  tokensMinted: BN;
};

export type GraduationCompleted = {
  projectId: BN;
  totalRaised: BN;
  holderCount: BN;
  solPriceUsd: BN;
  graduatedAt: BN;
  daysElapsed: BN;
};

export type HoldersGoalReached = {
  projectId: BN;
  holderCount: BN;
  reachedAt: BN;
};

export type RaiseGoalReached = {
  projectId: BN;
  totalRaised: BN;
  solPriceUsd: BN;
  reachedAt: BN;
};

export type GraduationAvailable = {
  projectId: BN;
  totalRaised: BN;
  holderCount: BN;
  solPriceUsd: BN;
  availableAt: BN;
};

// ── Enum types ────────────────────────────────────────────

export type ProjectState =
  | { SocialVoting: {} }
  | { EconomicPhase: {} }
  | { Failed: {} }
  | { Graduated: {} }
;
