use anchor_lang::prelude::*;
use crate::state::ProjectState;
use crate::errors::QuorumError;

/// Auto-fail al Día 284 — mecanismo de cierre cuando graduate_project nunca fue llamado.
/// Permissionless. Solo puede llamarse después de que expire la ventana (now > vesting_end).
/// Siempre resulta en estado Failed — no re-verifica condiciones.
pub fn handler(ctx: Context<crate::FinalizeFunding>) -> Result<()> {
    let project = &mut ctx.accounts.project;
    let now = Clock::get()?.unix_timestamp;

    require!(
        project.economic_phase_active,
        QuorumError::InvalidProjectState
    );

    require!(
        project.state == ProjectState::EconomicPhase,
        QuorumError::InvalidProjectState
    );

    require!(
        now > project.vesting_end,
        QuorumError::EconomicPhaseNotEnded
    );

    project.state = ProjectState::Failed;

    emit!(FundingFailed {
        project_id: project.project_id,
        total_raised: project.total_raised,
        holder_count: project.holder_count,
        failed_at: now,
    });

    Ok(())
}

#[event]
pub struct FundingFailed {
    pub project_id: u64,
    pub total_raised: u64,
    pub holder_count: u64,
    pub failed_at: i64,
}
