use anchor_lang::prelude::*;

/// Estados del ciclo de vida de un proyecto
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum ProjectState {
    /// Fase 1 activa: votación social (Día 1 al Día 30)
    SocialVoting,
    /// Fase 1 terminada, Fase 2 activa (si no abrió en paralelo)
    EconomicPhase,
    /// Vesting activo post-graduación exitosa (Día 284+)
    Vesting,
    /// Fondeo fallido al Día 284 — disponible para reembolso
    Failed,
    /// Vesting completado, proyecto graduado a DEX
    Graduated,
}

/// Datos principales de un proyecto en Quorum.
#[account]
#[derive(InitSpace)]
pub struct Project {
    /// Wallet del creador del proyecto
    pub dev: Pubkey,

    /// Mint del token SPL creado para este proyecto
    pub token_mint: Pubkey,

    /// ID único del proyecto (índice secuencial)
    pub project_id: u64,

    /// Nombre del proyecto
    #[max_len(64)]
    pub name: String,

    /// Ticker del token (ej: "QRMD")
    #[max_len(10)]
    pub ticker: String,

    /// Descripción de la utilidad del proyecto
    #[max_len(512)]
    pub description: String,

    /// URL del sitio web o repositorio
    #[max_len(128)]
    pub website_url: String,

    /// Estado actual del proyecto
    pub state: ProjectState,

    // ── Fase 1: Votación Social (Día 1 al Día 30) ──────────
    /// Timestamp de inicio de la votación social (Día 1)
    pub social_vote_start: i64,

    /// Total de votos sociales recibidos
    pub social_votes: u64,

    // ── Fase 2: Económica (abre Día 15, cierra Día 284) ────
    /// Si la fase económica ya está abierta
    /// Puede ser true mientras la social sigue activa (Día 15+)
    pub economic_phase_active: bool,

    /// Timestamp en que abrió la fase económica (Día 15)
    pub economic_phase_open: i64,

    /// Meta de recaudación definida por el dev (en lamports)
    /// Debe ser >= MIN_RAISE_LAMPORTS ($100,000 USD equiv.)
    pub raise_goal: u64,

    /// Total recaudado hasta el momento (en lamports)
    pub total_raised: u64,

    /// Número de contribuidores únicos (holders)
    pub holder_count: u64,

    /// Fee ya cobrada por la plataforma (en lamports)
    pub platform_fee_paid: u64,

    // ── Indicadores de salud trimestrales (informativos) ───
    /// Si ya se emitió el health check del Mes 3
    pub health_check_1_emitted: bool,

    /// Si ya se emitió el health check del Mes 6
    pub health_check_2_emitted: bool,

    // ── Vesting bilateral (Día 15 al Día 284) ──────────────
    /// Timestamp en que empieza el vesting (= economic_phase_open)
    pub vesting_start: i64,

    /// Timestamp en que termina el vesting y se evalúa la graduación (Día 284)
    pub vesting_end: i64,

    // ── Inactividad del dev ────────────────────────────────
    /// Último timestamp de actividad registrada del dev
    pub last_dev_activity: i64,

    /// Si el dev está bloqueado por inactividad (60 días sin actividad)
    pub dev_locked: bool,

    /// Bump del PDA
    pub bump: u8,
}
