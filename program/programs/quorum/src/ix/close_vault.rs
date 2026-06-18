use anchor_lang::prelude::*;
use crate::state::ProjectState;
use crate::errors::QuorumError;

/// Cierra el VaultAccount de un proyecto fallido una vez que todos los
/// reembolsos han sido procesados. El saldo rent-exempt se devuelve al caller.
/// Permissionless — cualquiera puede limpiar un vault ya vacío.
pub fn handler(ctx: Context<crate::CloseVault>) -> Result<()> {
    let project = &ctx.accounts.project;
    let vault = &ctx.accounts.vault;

    require!(
        project.state == ProjectState::Failed,
        QuorumError::InvalidProjectState
    );

    require!(
        vault.total_refunded >= vault.total_received,
        QuorumError::VaultNotFullyRefunded
    );

    // El cierre y la transferencia del saldo rent-exempt al caller
    // se ejecutan automáticamente via el atributo `close = caller` en el contexto.
    Ok(())
}

#[event]
pub struct VaultClosed {
    pub project_id: u64,
    pub total_received: u64,
    pub total_refunded: u64,
    pub closed_by: Pubkey,
}
