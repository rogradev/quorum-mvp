use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod state;
pub mod instructions;

use instructions::*;
use create_project::CreateProjectParams;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod quorum {
    use super::*;

    // ── Administración de plataforma ──────────────────────────
    pub fn initialize_platform(
        ctx: Context<initialize_platform::InitializePlatform>
    ) -> Result<()> {
        initialize_platform::handler(ctx)
    }

    // ── Ciclo de vida del proyecto ────────────────────────────

    /// Día 1: El dev crea el proyecto y arranca la votación social
    pub fn create_project(
        ctx: Context<create_project::CreateProject>,
        params: CreateProjectParams,
    ) -> Result<()> {
        create_project::handler(ctx, params)
    }

    /// Día 1-30: Cualquier wallet vota sobre la utilidad del proyecto
    pub fn cast_social_vote(
        ctx: Context<social_vote::CastSocialVote>
    ) -> Result<()> {
        social_vote::handler(ctx)
    }

    /// Día 15+: Abre la fase económica en paralelo con la votación social
    /// El vesting bilateral inicia simultáneamente
    pub fn open_economic_phase(
        ctx: Context<social_vote::OpenEconomicPhase>
    ) -> Result<()> {
        social_vote::open_economic_phase(ctx)
    }

    /// Día 30+: Cierra la fase social (la económica continúa hasta Día 284)
    pub fn close_social_phase(
        ctx: Context<social_vote::CloseSocialPhase>
    ) -> Result<()> {
        social_vote::close_social_phase(ctx)
    }

    /// Día 15-284: Contribución económica con límite de 0.1% por holder
    pub fn contribute(
        ctx: Context<contribute::Contribute>,
        amount_lamports: u64
    ) -> Result<()> {
        contribute::handler(ctx, amount_lamports)
    }

    /// Mes 3 y Mes 6: Emite indicadores de salud públicos (informativos)
    pub fn emit_health_check(
        ctx: Context<social_vote::EmitHealthCheck>
    ) -> Result<()> {
        social_vote::emit_health_check(ctx)
    }

    /// Día 284+: Evaluación final — graduación o reembolso del 99%
    /// Requiere: $100,000 recaudados Y 1,000 holders únicos
    pub fn finalize_funding(
        ctx: Context<finalize_funding::FinalizeFunding>
    ) -> Result<()> {
        finalize_funding::handler(ctx)
    }

    /// Proyecto fallido: holder reclama reembolso del 99%
    pub fn refund(
        ctx: Context<refund::Refund>
    ) -> Result<()> {
        refund::handler(ctx)
    }

    // ── Actividad del dev ─────────────────────────────────────

    /// Dev registra actividad on-chain para evitar bloqueo por inactividad
    pub fn register_dev_activity(
        ctx: Context<dev_activity::RegisterDevActivity>
    ) -> Result<()> {
        dev_activity::handler(ctx)
    }

    /// Activa el bloqueo del dev por inactividad (60+ días sin actividad)
    pub fn trigger_inactivity(
        ctx: Context<dev_activity::TriggerInactivity>
    ) -> Result<()> {
        dev_activity::trigger_inactivity(ctx)
    }
}
