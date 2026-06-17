use anchor_lang::prelude::*;

/// Vault del proyecto — custodia SOL de contribuidores y lleva contabilidad.
/// PDA derivada de [VAULT_SEED, project_id]
#[account]
#[derive(InitSpace)]
pub struct VaultAccount {
    /// PDA del proyecto propietario de este vault
    pub project: Pubkey,

    /// Total de SOL (neto de fees) recibido de contribuidores (en lamports)
    pub total_received: u64,

    /// Total de SOL devuelto en reembolsos (en lamports)
    pub total_refunded: u64,

    /// Bump del PDA
    pub bump: u8,
}
