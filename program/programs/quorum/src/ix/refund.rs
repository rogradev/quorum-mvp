use anchor_lang::prelude::*;
use crate::state::ProjectState;
use crate::errors::QuorumError;

/// Reembolsa al holder si el proyecto falló.
/// Devuelve el 99% neto depositado (el 1% de fee fue no-reembolsable al contribuir).
/// El vault es program-owned; los lamports se mueven directamente con checks de seguridad.
pub fn handler(ctx: Context<crate::Refund>) -> Result<()> {
    let project = &ctx.accounts.project;
    let contribution = &mut ctx.accounts.contribution;
    let now = Clock::get()?.unix_timestamp;

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

    // ── Verificar que el vault tiene saldo suficiente ────────
    // El vault debe mantener el mínimo rent-exempt después del reembolso
    let rent = Rent::get()?;
    let vault_data_len = ctx.accounts.vault.to_account_info().data_len();
    let vault_rent_exempt = rent.minimum_balance(vault_data_len);
    let vault_lamports = ctx.accounts.vault.to_account_info().lamports();

    require!(
        vault_lamports >= refund_amount
            .checked_add(vault_rent_exempt)
            .ok_or(QuorumError::ArithmeticOverflow)?,
        QuorumError::InsufficientVaultBalance
    );

    // ── Transferir lamports: vault → contributor ─────────────
    // Para cuentas program-owned, la única forma válida de mover lamports
    // es manipulación directa (system_program::transfer requiere from = system-owned).
    let contributor_lamports = ctx.accounts.contributor.to_account_info().lamports();

    **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? = vault_lamports
        .checked_sub(refund_amount)
        .ok_or(QuorumError::ArithmeticOverflow)?;

    **ctx.accounts.contributor.to_account_info().try_borrow_mut_lamports()? =
        contributor_lamports
            .checked_add(refund_amount)
            .ok_or(QuorumError::ArithmeticOverflow)?;

    // ── Actualizar contabilidad del vault ────────────────────
    let vault = &mut ctx.accounts.vault;
    vault.total_refunded = vault
        .total_refunded
        .checked_add(refund_amount)
        .ok_or(QuorumError::ArithmeticOverflow)?;

    // ── Marcar contribución como reembolsada ─────────────────
    contribution.refunded = true;
    contribution.refunded_at = now;
    contribution.amount_lamports = 0;

    emit!(RefundProcessed {
        project_id: project.project_id,
        contributor: ctx.accounts.contributor.key(),
        refund_amount,
        refunded_at: now,
        vault_total_refunded: vault.total_refunded,
        vault_total_received: vault.total_received,
    });

    Ok(())
}

#[event]
pub struct RefundProcessed {
    pub project_id: u64,
    pub contributor: Pubkey,
    pub refund_amount: u64,
    pub refunded_at: i64,
    pub vault_total_refunded: u64,
    pub vault_total_received: u64,
}
