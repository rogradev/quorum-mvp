use anchor_lang::prelude::*;
use crate::state::{Project, ProjectState};
use crate::constants::*;
use crate::errors::QuorumError;

/// Evaluación final al Día 284.
/// REGLA HARD: requiere $100,000 USD equiv. recaudados Y 1,000 holders únicos.
/// REGLA HARD: sin margen de gracia. Sin excepciones.
/// REGLA HARD: si falla, 99% devuelto automáticamente on-chain.
/// Permissionless — cualquiera puede llamar esto al vencer el período.
pub fn handler(ctx: Context<FinalizeFunding>) -> Result<()> {
    let project = &mut ctx.accounts.project;
    let now = Clock::get()?.unix_timestamp;

    // Solo aplica si la fase económica está activa
    require!(
        project.economic_phase_active,
        QuorumError::InvalidProjectState
    );

    // El estado debe ser EconomicPhase (la social ya cerró)
    require!(
        project.state == ProjectState::EconomicPhase,
        QuorumError::InvalidProjectState
    );

    // Verificar que han pasado los 270 días desde que abrió la fase económica
    // Esto equivale al Día 284 desde el inicio del proyecto
    require!(
        now > project.vesting_end,
        QuorumError::EconomicPhaseNotEnded
    );

    // ── Evaluación de las dos condiciones hard ──────────────
    // CONDICIÓN 1: mínimo 1,000 holders únicos
    let holders_ok = project.holder_count >= MIN_HOLDERS;

    // CONDICIÓN 2: mínimo $100,000 USD equiv. recaudados
    // Además debe haber alcanzado la meta declarada por el dev
    let min_raise_ok = project.total_raised >= MIN_RAISE_LAMPORTS;
    let goal_ok = project.total_raised >= project.raise_goal;
    let funds_ok = min_raise_ok && goal_ok;

    if holders_ok && funds_ok {
        // ✅ Proyecto exitoso — graduación
        // El vesting ya corrió durante los 270 días
        // Ahora se marca como graduado para migración a DEX
        project.state = ProjectState::Graduated;

        emit!(FundingSucceeded {
            project_id: project.project_id,
            total_raised: project.total_raised,
            holder_count: project.holder_count,
            graduated_at: now,
        });
    } else {
        // ❌ Proyecto fallido — disponible para reembolsos del 99%
        // REGLA HARD: sin margen de gracia, sin excepciones
        project.state = ProjectState::Failed;

        emit!(FundingFailed {
            project_id: project.project_id,
            total_raised: project.total_raised,
            holder_count: project.holder_count,
            holders_ok,
            min_raise_ok,
            goal_ok,
            failed_at: now,
        });
    }

    Ok(())
}

#[derive(Accounts)]
pub struct FinalizeFunding<'info> {
    #[account(
        mut,
        seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()],
        bump = project.bump
    )]
    pub project: Account<'info, Project>,

    /// Permissionless — cualquiera puede llamar la evaluación final
    pub caller: Signer<'info>,
}

#[event]
pub struct FundingSucceeded {
    pub project_id: u64,
    pub total_raised: u64,
    pub holder_count: u64,
    pub graduated_at: i64,
}

#[event]
pub struct FundingFailed {
    pub project_id: u64,
    pub total_raised: u64,
    pub holder_count: u64,
    pub holders_ok: bool,
    pub min_raise_ok: bool,
    pub goal_ok: bool,
    pub failed_at: i64,
}
