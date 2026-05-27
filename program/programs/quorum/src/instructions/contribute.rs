use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{Platform, Project, Contribution};
use crate::constants::*;
use crate::errors::QuorumError;

/// Contribución económica — disponible desde el Día 15 hasta el Día 284.
/// REGLA HARD: mínimo $1 USD por wallet.
/// REGLA HARD: máximo 0.1% del supply por wallet — forzado on-chain.
/// REGLA HARD: fee del 0.1% cobrado inmediatamente, no reembolsable.
pub fn handler(ctx: Context<Contribute>, amount_lamports: u64) -> Result<()> {
    let project = &mut ctx.accounts.project;
    let platform = &mut ctx.accounts.platform;
    let now = Clock::get()?.unix_timestamp;

    // ── Validación: la fase económica debe estar activa ─────
    // economic_phase_active se activa al Día 15 — en paralelo con la social
    require!(
        project.economic_phase_active,
        QuorumError::EconomicPhaseNotActive
    );

    // ── Validación: el período de fondeo no ha terminado ────
    // El fondeo cierra al Día 284 (270 días desde que abrió la fase económica)
    let phase_deadline = project
        .economic_phase_open
        .checked_add(ECONOMIC_PHASE_DURATION_SECS)
        .ok_or(QuorumError::ArithmeticOverflow)?;

    require!(now <= phase_deadline, QuorumError::EconomicPhaseNotActive);

    // ── Validación: mínimo $1 USD equiv. en lamports ────────
    require!(
        amount_lamports >= MIN_CONTRIBUTION_LAMPORTS,
        QuorumError::ContributionTooLow
    );

    // ── Calcular tokens a asignar proporcionalmente ─────────
    // Tokens = TOKEN_SUPPLY × (amount / raise_goal)
    let tokens_for_amount = (amount_lamports as u128)
        .checked_mul(TOKEN_SUPPLY as u128)
        .ok_or(QuorumError::ArithmeticOverflow)?
        .checked_div(project.raise_goal as u128)
        .ok_or(QuorumError::ArithmeticOverflow)? as u64;

    // ── Validación: límite 0.1% del supply por holder ───────
    // REGLA HARD: forzado on-chain, no es un límite de UI
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

    // ── Cobrar fee de plataforma (0.1%) inmediatamente ──────
    // REGLA HARD: no reembolsable — pase o falle el proyecto
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
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.contributor.to_account_info(),
                to: ctx.accounts.project_vault.to_account_info(),
            },
        ),
        net_contribution,
    )?;

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
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(amount_lamports: u64)]
pub struct Contribute<'info> {
    #[account(
        mut,
        seeds = [PLATFORM_SEED],
        bump = platform.bump
    )]
    pub platform: Account<'info, Platform>,

    #[account(
        mut,
        seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()],
        bump = project.bump
    )]
    pub project: Account<'info, Project>,

    #[account(
        init_if_needed,
        payer = contributor,
        space = 8 + Contribution::INIT_SPACE,
        seeds = [CONTRIBUTION_SEED, &project.project_id.to_le_bytes(), contributor.key().as_ref()],
        bump
    )]
    pub contribution: Account<'info, Contribution>,

    /// CHECK: Vault del proyecto — PDA sin data que recibe SOL
    #[account(
        mut,
        seeds = [b"vault", &project.project_id.to_le_bytes()],
        bump
    )]
    pub project_vault: UncheckedAccount<'info>,

    /// CHECK: Tesorería de la plataforma
    #[account(
        mut,
        constraint = treasury.key() == platform.treasury
    )]
    pub treasury: UncheckedAccount<'info>,

    #[account(mut)]
    pub contributor: Signer<'info>,

    pub system_program: Program<'info, System>,
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
}
