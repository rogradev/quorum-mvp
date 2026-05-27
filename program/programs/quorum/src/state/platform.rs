use anchor_lang::prelude::*;

/// Estado global de la plataforma Quorum.
/// Un único PDA controla la configuración y tesorería.
#[account]
#[derive(InitSpace)]
pub struct Platform {
    /// Administrador con capacidad de actualizar parámetros
    pub authority: Pubkey,

    /// Wallet donde van las fees de la plataforma
    pub treasury: Pubkey,

    /// Total de proyectos creados (sirve como nonce para PDAs)
    pub total_projects: u64,

    /// Total acumulado en fees (en lamports)
    pub total_fees_collected: u64,

    /// Bump del PDA
    pub bump: u8,
}
