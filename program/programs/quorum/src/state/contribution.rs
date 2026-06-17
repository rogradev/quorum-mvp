use anchor_lang::prelude::*;

/// Registra la contribución de un holder en un proyecto específico.
/// PDA derivada de [CONTRIBUTION_SEED, project_id, contributor_pubkey]
#[account]
#[derive(InitSpace)]
pub struct Contribution {
    /// Proyecto al que pertenece
    pub project_id: u64,

    /// Wallet del contribuidor
    pub contributor: Pubkey,

    /// Cantidad aportada en lamports
    pub amount_lamports: u64,

    /// Tokens asignados en proporción al aporte
    pub tokens_allocated: u64,

    /// Si ya reclamó sus tokens post-vesting
    pub claimed: bool,

    /// Si ya fue reembolsado (en caso de proyecto fallido)
    pub refunded: bool,

    /// Timestamp de la contribución
    pub contributed_at: i64,

    /// Timestamp del reembolso (0 si no ha sido reembolsado)
    pub refunded_at: i64,

    /// Precio de SOL en USD al momento de la contribución (consulta Pyth)
    pub sol_price_at_contribution: u64,

    /// Bump del PDA
    pub bump: u8,
}
