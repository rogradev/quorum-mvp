use anchor_lang::prelude::*;

/// Registra el voto social de una wallet en un proyecto.
/// Previene votar dos veces desde la misma wallet.
/// PDA derivada de [VOTE_SEED, project_id, voter_pubkey]
#[account]
#[derive(InitSpace)]
pub struct SocialVote {
    /// Proyecto votado
    pub project_id: u64,

    /// Wallet que votó
    pub voter: Pubkey,

    /// Timestamp del voto
    pub voted_at: i64,

    /// Bump del PDA
    pub bump: u8,
}
