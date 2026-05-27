// ============================================================
// QUORUM PROTOCOL — CONSTANTS
// v0.2 — Aligned with final hard rules
// ============================================================

/// Fee que retiene la plataforma sobre el total recaudado (0.1%)
pub const PLATFORM_FEE_BPS: u64 = 10; // basis points: 10 = 0.1%

/// Máximo % de supply que puede tener un holder durante vesting (0.1%)
pub const MAX_HOLDER_BPS: u64 = 10; // 10 basis points = 0.1%

/// Mínimo de holders requeridos para graduación
pub const MIN_HOLDERS: u64 = 1_000;

/// Mínimo de recaudación en lamports equivalente a $100,000 USD
/// Asumiendo SOL ~$150 USD → $100,000 = ~666.67 SOL = 666_666_667_000 lamports
/// Ajustar según precio real de SOL al deployar
pub const MIN_RAISE_LAMPORTS: u64 = 666_666_667_000;

/// Mínimo de contribución por wallet equivalente a $1 USD
/// Asumiendo SOL ~$150 USD → $1 = ~0.00667 SOL = 6_666_667 lamports
pub const MIN_CONTRIBUTION_LAMPORTS: u64 = 6_666_667;

/// Duración del vesting en segundos (9 meses = 270 días)
pub const VESTING_DURATION_SECS: i64 = 270 * 24 * 60 * 60;

/// Duración de la fase de votación social en segundos (30 días)
pub const SOCIAL_VOTE_DURATION_SECS: i64 = 30 * 24 * 60 * 60;

/// Día en que se puede abrir la fase económica en paralelo con la social (Día 15)
pub const ECONOMIC_PHASE_OPEN_DAY_SECS: i64 = 15 * 24 * 60 * 60;

/// Duración de la fase económica desde que abre (270 días — hasta el Día 284)
pub const ECONOMIC_PHASE_DURATION_SECS: i64 = 270 * 24 * 60 * 60;

/// Indicador de salud Mes 3 — objetivo: 10% de la meta
pub const HEALTH_CHECK_1_SECS: i64 = 90 * 24 * 60 * 60;
pub const HEALTH_CHECK_1_TARGET_BPS: u64 = 1_000; // 10% en basis points

/// Indicador de salud Mes 6 — objetivo: 40% de la meta
pub const HEALTH_CHECK_2_SECS: i64 = 180 * 24 * 60 * 60;
pub const HEALTH_CHECK_2_TARGET_BPS: u64 = 4_000; // 40% en basis points

/// Supply total del token (1 billón con 6 decimales)
pub const TOKEN_SUPPLY: u64 = 1_000_000_000_000_000; // 1B tokens × 10^6

/// Decimales del token
pub const TOKEN_DECIMALS: u8 = 6;

/// Semilla PDA del estado global de la plataforma
pub const PLATFORM_SEED: &[u8] = b"platform";

/// Semilla PDA de cada proyecto
pub const PROJECT_SEED: &[u8] = b"project";

/// Semilla PDA de cada contribución
pub const CONTRIBUTION_SEED: &[u8] = b"contribution";

/// Semilla PDA del voto social
pub const VOTE_SEED: &[u8] = b"vote";

/// Días de inactividad del dev antes de alerta pública (30 días)
pub const INACTIVITY_ALERT_SECS: i64 = 30 * 24 * 60 * 60;

/// Días de inactividad antes de bloqueo del dev (60 días)
pub const INACTIVITY_LOCK_SECS: i64 = 60 * 24 * 60 * 60;

/// Días de inactividad antes de votación de holders (90 días)
pub const INACTIVITY_VOTE_SECS: i64 = 90 * 24 * 60 * 60;
