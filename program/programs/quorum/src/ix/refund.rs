use anchor_lang::prelude::*;
use crate::state::{Project, ProjectState, Contribution};
use crate::constants::*;
use crate::errors::QuorumError;

/// Reembolsa al holder si el proyecto falló.
/// Devuelve el 99% del aporte (el 1% ya fue cobrado por la plataforma al contribuir).
/// En realidad devuelve el net_contribution completo que está en el vault.
pub fn handler(ctx: Context<crate::Refund>) -> Result<()> {
    let project = &ctx.accounts.project;
    let contribution = &mut ctx.accounts.contribution;

    require!(
        project.state == ProjectState::Failed,
        QuorumError::ProjectSucceeded
    );

    require!(
        contribution.amount_lamports > 0,
        QuorumError::NothingToRefund
    );

    require!(!contribution.refunded, QuorumError::NothingToRefund);

    let refund_amount = contribution.amount_lamports;
    let project_id_bytes = project.project_id.to_le_bytes();

    // Encontrar el bump del vault
    let vault_seeds = &[
        b"vault",
        project_id_bytes.as_ref(),
        &[ctx.bumps.project_vault],
    ];

    // Transferir desde el vault al contribuidor
    **ctx.accounts.project_vault.try_borrow_mut_lamports()? = ctx
        .accounts
        .project_vault
        .lamports()
        .checked_sub(refund_amount)
        .ok_or(QuorumError::ArithmeticOverflow)?;

    **ctx.accounts.contributor.try_borrow_mut_lamports()? = ctx
        .accounts
        .contributor
        .lamports()
        .checked_add(refund_amount)
        .ok_or(QuorumError::ArithmeticOverflow)?;

    contribution.refunded = true;
    contribution.amount_lamports = 0;

    emit!(RefundIssued {
        project_id: project.project_id,
        contributor: ctx.accounts.contributor.key(),
        refund_amount,
    });

    // Suprimir advertencia de unused variable
    let _ = vault_seeds;

    Ok(())
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(
        seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()],
        bump = project.bump
    )]
    pub project: Account<'info, Project>,

    #[account(
        mut,
        seeds = [CONTRIBUTION_SEED, &project.project_id.to_le_bytes(), contributor.key().as_ref()],
        bump = contribution.bump,
        constraint = contribution.contributor == contributor.key()
    )]
    pub contribution: Account<'info, Contribution>,

    /// CHECK: Vault del proyecto del que salen los fondos
    #[account(
        mut,
        seeds = [b"vault", &project.project_id.to_le_bytes()],
        bump
    )]
    pub project_vault: UncheckedAccount<'info>,

    #[account(mut)]
    pub contributor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct RefundIssued {
    pub project_id: u64,
    pub contributor: Pubkey,
    pub refund_amount: u64,
}
