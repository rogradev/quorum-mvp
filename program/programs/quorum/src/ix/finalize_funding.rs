use anchor_lang::prelude::*;
use crate::state::{Project, ProjectState};
use crate::constants::*;
use crate::errors::QuorumError;
use crate::utils::price;

/// Evaluación final al Día 284.
/// REGLA HARD: requiere $100,000 USD equiv. (calculado con precio Pyth al momento
/// de finalización) Y 1,000 holders únicos.
/// Permissionless — cualquiera puede llamar esto al vencer el período.
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

    // ── Precio dinámico via Pyth ─────────────────────────────
    let sol_price = price::get_sol_price_usd(&ctx.accounts.price_feed, now)?;
    let min_raise = price::usd_to_lamports(100_000, sol_price)?; // $100K mínimo

    // ── Evaluación de las dos condiciones hard ──────────────
    let holders_ok = project.holder_count >= MIN_HOLDERS;

    // Debe superar el mínimo dinámico ($100K USD al precio actual de SOL)
    // Y la meta declarada por el dev
    let min_raise_ok = project.total_raised >= min_raise;
    let goal_ok = project.total_raised >= project.raise_goal;
    let funds_ok = min_raise_ok && goal_ok;

    if holders_ok && funds_ok {
        project.state = ProjectState::Graduated;

        emit!(FundingSucceeded {
            project_id: project.project_id,
            total_raised: project.total_raised,
            holder_count: project.holder_count,
            sol_price_usd: sol_price,
            graduated_at: now,
        });
    } else {
        project.state = ProjectState::Failed;

        emit!(FundingFailed {
            project_id: project.project_id,
            total_raised: project.total_raised,
            holder_count: project.holder_count,
            sol_price_usd: sol_price,
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

    pub caller: Signer<'info>,
}

#[event]
pub struct FundingSucceeded {
    pub project_id: u64,
    pub total_raised: u64,
    pub holder_count: u64,
    pub sol_price_usd: u64,
    pub graduated_at: i64,
}

#[event]
pub struct FundingFailed {
    pub project_id: u64,
    pub total_raised: u64,
    pub holder_count: u64,
    pub sol_price_usd: u64,
    pub holders_ok: bool,
    pub min_raise_ok: bool,
    pub goal_ok: bool,
    pub failed_at: i64,
}
