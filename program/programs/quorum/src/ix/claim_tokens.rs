use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};
use crate::state::{Project, ProjectState, Contribution};
use crate::constants::*;
use crate::errors::QuorumError;

/// El contributor reclama sus tokens tras la graduación del proyecto.
/// El PDA del proyecto firma el mint como mint_authority.
pub fn handler(ctx: Context<crate::ClaimTokens>) -> Result<()> {
    let project = &ctx.accounts.project;
    let contribution = &mut ctx.accounts.contribution;

    require!(
        project.state == ProjectState::Graduated,
        QuorumError::InvalidProjectState
    );

    require!(!contribution.claimed, QuorumError::VestingAlreadyClaimed);

    require!(
        contribution.tokens_allocated > 0,
        QuorumError::NothingToRefund
    );

    let tokens_to_mint = contribution.tokens_allocated;
    let project_id_bytes = project.project_id.to_le_bytes();
    let seeds = &[PROJECT_SEED, project_id_bytes.as_ref(), &[project.bump]];
    let signer_seeds = &[&seeds[..]];

    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.token_mint.to_account_info(),
                to: ctx.accounts.contributor_token_account.to_account_info(),
                authority: ctx.accounts.project.to_account_info(),
            },
            signer_seeds,
        ),
        tokens_to_mint,
    )?;

    contribution.claimed = true;

    emit!(TokensClaimed {
        project_id: project.project_id,
        contributor: ctx.accounts.contributor.key(),
        tokens_minted: tokens_to_mint,
    });

    Ok(())
}

#[event]
pub struct TokensClaimed {
    pub project_id: u64,
    pub contributor: Pubkey,
    pub tokens_minted: u64,
}
