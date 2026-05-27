use anchor_lang::prelude::*;

#[error_code]
pub enum QuorumError {
    // ── Fase de creación ──────────────────────────────────────
    #[msg("El nombre del proyecto no puede estar vacío")]
    EmptyName,

    #[msg("El ticker no puede estar vacío")]
    EmptyTicker,

    #[msg("La descripción no puede estar vacía")]
    EmptyDescription,

    #[msg("La meta de recaudación es demasiado baja (mínimo $100 USD equivalente)")]
    RaiseTooLow,

    // ── Fase 1: Votación social ───────────────────────────────
    #[msg("La fase de votación social no está activa")]
    SocialVoteNotActive,

    #[msg("Ya votaste en este proyecto")]
    AlreadyVoted,

    #[msg("La fase de votación social no ha terminado")]
    SocialVoteNotEnded,

    // ── Fase 2: Contribución económica ───────────────────────
    #[msg("La fase económica no está activa")]
    EconomicPhaseNotActive,

    #[msg("La fase económica no ha terminado")]
    EconomicPhaseNotEnded,

    #[msg("La contribución mínima es $1 USD equivalente")]
    ContributionTooLow,

    #[msg("Esta contribución excede el límite de 0.1% del supply por holder")]
    ExceedsHolderLimit,

    #[msg("Ya contribuiste en este proyecto")]
    AlreadyContributed,

    // ── Finalización y vesting ────────────────────────────────
    #[msg("El proyecto no alcanzó el mínimo de holders requeridos (1,000)")]
    NotEnoughHolders,

    #[msg("El proyecto no alcanzó la meta de recaudación mínima")]
    NotEnoughFunds,

    #[msg("El proyecto ya fue finalizado")]
    AlreadyFinalized,

    #[msg("El proyecto aún no fue finalizado")]
    NotFinalized,

    #[msg("El vesting aún no ha terminado")]
    VestingNotComplete,

    #[msg("El vesting ya fue reclamado")]
    VestingAlreadyClaimed,

    // ── Reembolso ─────────────────────────────────────────────
    #[msg("No hay fondos para reembolsar")]
    NothingToRefund,

    #[msg("El proyecto fue exitoso, no hay reembolso disponible")]
    ProjectSucceeded,

    // ── Inactividad del dev ───────────────────────────────────
    #[msg("Solo el dev puede registrar actividad")]
    UnauthorizedActivityUpdate,

    #[msg("El dev está bloqueado por inactividad")]
    DevLocked,

    // ── General ───────────────────────────────────────────────
    #[msg("Overflow aritmético")]
    ArithmeticOverflow,

    #[msg("El proyecto no existe en el estado esperado")]
    InvalidProjectState,

    #[msg("Solo el administrador de la plataforma puede ejecutar esto")]
    Unauthorized,
}
