use anchor_lang::prelude::*;
use crate::state::{Project, ProjectState};
use crate::constants::*;
use crate::errors::QuorumError;

/// El dev registra actividad on-chain para resetear el contador de inactividad.
/// Debe llamarse al menos cada 30 días para evitar la alerta,
/// y cada 60 días para evitar el bloqueo.
pub fn handler(ctx: Context<RegisterDevActivity>) -> Result<()> {
    let project = &mut ctx.accounts.project;

    require!(
        ctx.accounts.dev.key() == project.dev,
        QuorumError::UnauthorizedActivityUpdate
    );

    require!(!project.dev_locked, QuorumError::DevLocked);

    // Solo aplica durante vesting
    require!(
        project.state == ProjectState::Vesting,
        QuorumError::InvalidProjectState
    );

    let now = Clock::get()?.unix_timestamp;
    project.last_dev_activity = now;

    emit!(DevActivityRegistered {
        project_id: project.project_id,
        dev: project.dev,
        timestamp: now,
    });

    Ok(())
}

/// Cualquiera puede llamar esto para activar el bloqueo si el dev está inactivo.
pub fn trigger_inactivity(ctx: Context<TriggerInactivity>) -> Result<()> {
    let project = &mut ctx.accounts.project;
    let now = Clock::get()?.unix_timestamp;

    require!(
        project.state == ProjectState::Vesting,
        QuorumError::InvalidProjectState
    );

    let inactive_for = now
        .checked_sub(project.last_dev_activity)
        .ok_or(QuorumError::ArithmeticOverflow)?;

    require!(
        inactive_for >= INACTIVITY_LOCK_SECS,
        QuorumError::InvalidProjectState
    );

    project.dev_locked = true;

    emit!(DevLocked {
        project_id: project.project_id,
        dev: project.dev,
        inactive_for_days: inactive_for / 86_400,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct RegisterDevActivity<'info> {
    #[account(
        mut,
        seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()],
        bump = project.bump
    )]
    pub project: Account<'info, Project>,

    pub dev: Signer<'info>,
}

#[derive(Accounts)]
pub struct TriggerInactivity<'info> {
    #[account(
        mut,
        seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()],
        bump = project.bump
    )]
    pub project: Account<'info, Project>,

    pub caller: Signer<'info>,
}

#[event]
pub struct DevActivityRegistered {
    pub project_id: u64,
    pub dev: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct DevLocked {
    pub project_id: u64,
    pub dev: Pubkey,
    pub inactive_for_days: i64,
}
