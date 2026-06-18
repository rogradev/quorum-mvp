use anchor_lang::prelude::*;
use crate::state::ProjectState;
use crate::constants::*;
use crate::errors::QuorumError;
use crate::utils::price;

/// Graduación permissionless entre el Día 180 y el Día 284 desde apertura económica.
/// Cualquiera puede llamarlo una vez que se cumplan las condiciones.
/// Si no se llama antes del Día 284, finalize_funding cierra el proyecto como Failed.
pub fn handler(ctx: Context<crate::GraduateProject>) -> Result<()> {
    let project = &mut ctx.accounts.project;
    let vault = &ctx.accounts.vault;
    let now = Clock::get()?.unix_timestamp;

    require!(
        project.state == ProjectState::EconomicPhase,
        QuorumError::InvalidProjectState
    );

    // Ventana no abierta aún (antes del Día 180 desde apertura económica)
    let graduation_start = project
        .vesting_start
        .checked_add(GRADUATION_MIN_SECS)
        .ok_or(QuorumError::ArithmeticOverflow)?;
    require!(now >= graduation_start, QuorumError::GraduationNotAvailableYet);

    // Ventana ya cerrada (después del Día 284)
    require!(now <= project.vesting_end, QuorumError::GraduationWindowExpired);

    // Condición hard: mínimo de holders
    require!(
        project.holder_count >= MIN_HOLDERS,
        QuorumError::GraduationNotAvailableYet
    );

    // Condición hard: mínimo de fondeo ($100K al precio SOL actual)
    let sol_price = price::get_sol_price_usd(&ctx.accounts.price_feed, now)?;
    let min_raise = price::usd_to_lamports(100_000, sol_price)?;
    require!(
        vault.total_received >= min_raise,
        QuorumError::GraduationNotAvailableYet
    );

    let days_elapsed = now
        .checked_sub(project.vesting_start)
        .ok_or(QuorumError::ArithmeticOverflow)?
        / 86_400;

    project.state = ProjectState::Graduated;

    emit!(GraduationCompleted {
        project_id: project.project_id,
        total_raised: project.total_raised,
        holder_count: project.holder_count,
        sol_price_usd: sol_price,
        graduated_at: now,
        days_elapsed,
    });

    Ok(())
}

#[event]
pub struct GraduationCompleted {
    pub project_id: u64,
    pub total_raised: u64,
    pub holder_count: u64,
    pub sol_price_usd: u64,
    pub graduated_at: i64,
    pub days_elapsed: i64,
}
