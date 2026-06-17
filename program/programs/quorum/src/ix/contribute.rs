use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{Platform, Project, Contribution, VaultAccount};
use crate::constants::*;
use crate::errors::QuorumError;
use crate::utils::price;

pub fn handler(ctx: Context<crate::Contribute>, amount_lamports: u64) -> Result<()> {
    let project = &mut ctx.accounts.project;
    let platform = &mut ctx.accounts.platform;
    let now = Clock::get()?.unix_timestamp;

    // ── Validación: la fase económica debe estar activa ─────
    require!(
        project.economic_phase_active,
        QuorumError::EconomicPhaseNotActive
    );

    // ── Validación: el período de fondeo no ha terminado ────
    let phase_deadline = project
        .economic_phase_open
        .checked_add(ECONOMIC_PHASE_DURATION_SECS)
        .ok_or(QuorumError::ArithmeticOverflow)?;

    require!(now <= phase_deadline, QuorumError::EconomicPhaseNotActive);

    // ── Precio dinámico via Pyth ─────────────────────────────
    let sol_price = price::get_sol_price_usd(&ctx.accounts.price_feed, now)?;
    let min_contribution = price::usd_to_lamports(1, sol_price)?; // $1 mínimo

    require!(
        amount_lamports >= min_contribution,
        QuorumError::ContributionTooLow
    );

    // ── Calcular tokens a asignar proporcionalmente ─────────
    let tokens_for_amount = (amount_lamports as u128)
        .checked_mul(TOKEN_SUPPLY as u128)
        .ok_or(QuorumError::ArithmeticOverflow)?
        .checked_div(project.raise_goal as u128)
        .ok_or(QuorumError::ArithmeticOverflow)? as u64;

    // ── Validación: límite 0.1% del supply por holder ───────
    let max_tokens_per_holder = TOKEN_SUPPLY
        .checked_mul(MAX_HOLDER_BPS)
        .ok_or(QuorumError::ArithmeticOverflow)?
        .checked_div(10_000)
        .ok_or(QuorumError::ArithmeticOverflow)?;

    let existing_tokens = ctx.accounts.contribution.tokens_allocated;
    let new_total_tokens = existing_tokens
        .checked_add(tokens_for_amount)
        .ok_or(QuorumError::ArithmeticOverflow)?;

    require!(
        new_total_tokens <= max_tokens_per_holder,
        QuorumError::ExceedsHolderLimit
    );

    // ── Cobrar fee de plataforma (0.1%) ─────────────────────
    let platform_fee = amount_lamports
        .checked_mul(PLATFORM_FEE_BPS)
        .ok_or(QuorumError::ArithmeticOverflow)?
        .checked_div(10_000)
        .ok_or(QuorumError::ArithmeticOverflow)?;

    let net_contribution = amount_lamports
        .checked_sub(platform_fee)
        .ok_or(QuorumError::ArithmeticOverflow)?;

    // Transferir fee a tesorería de la plataforma
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.contributor.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
            },
        ),
        platform_fee,
    )?;

    // Transferir contribución neta al vault del proyecto
    // (system_program::transfer puede depositar a cuentas program-owned)
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.contributor.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        net_contribution,
    )?;

    // ── Actualizar contabilidad del vault ────────────────────
    let vault = &mut ctx.accounts.vault;
    vault.total_received = vault
        .total_received
        .checked_add(net_contribution)
        .ok_or(QuorumError::ArithmeticOverflow)?;

    // ── Actualizar estado de la contribución ─────────────────
    let contribution = &mut ctx.accounts.contribution;
    let is_new_holder = contribution.amount_lamports == 0;

    contribution.project_id = project.project_id;
    contribution.contributor = ctx.accounts.contributor.key();
    contribution.amount_lamports = contribution
        .amount_lamports
        .checked_add(net_contribution)
        .ok_or(QuorumError::ArithmeticOverflow)?;
    contribution.tokens_allocated = new_total_tokens;
    contribution.claimed = false;
    contribution.refunded = false;
    contribution.contributed_at = now;
    contribution.refunded_at = 0;
    contribution.sol_price_at_contribution = sol_price;
    contribution.bump = ctx.bumps.contribution;

    // ── Actualizar estado del proyecto ───────────────────────
    project.total_raised = project
        .total_raised
        .checked_add(net_contribution)
        .ok_or(QuorumError::ArithmeticOverflow)?;

    project.platform_fee_paid = project
        .platform_fee_paid
        .checked_add(platform_fee)
        .ok_or(QuorumError::ArithmeticOverflow)?;

    if is_new_holder {
        project.holder_count = project
            .holder_count
            .checked_add(1)
            .ok_or(QuorumError::ArithmeticOverflow)?;
    }

    platform.total_fees_collected = platform
        .total_fees_collected
        .checked_add(platform_fee)
        .ok_or(QuorumError::ArithmeticOverflow)?;

    emit!(ContributionMade {
        project_id: project.project_id,
        contributor: ctx.accounts.contributor.key(),
        amount_lamports: net_contribution,
        tokens_allocated: new_total_tokens,
        total_raised: project.total_raised,
        holder_count: project.holder_count,
        platform_fee,
        sol_price_usd: sol_price,
    });

    Ok(())
}

#[event]
pub struct ContributionMade {
    pub project_id: u64,
    pub contributor: Pubkey,
    pub amount_lamports: u64,
    pub tokens_allocated: u64,
    pub total_raised: u64,
    pub holder_count: u64,
    pub platform_fee: u64,
    pub sol_price_usd: u64,
}
