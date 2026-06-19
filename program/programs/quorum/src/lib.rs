use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};

pub mod constants;
pub mod errors;
pub mod state;
pub mod ix;
pub mod utils;

use crate::state::{Platform, Project, Contribution, SocialVote, VaultAccount};
use crate::constants::*;
use crate::errors::QuorumError;

declare_id!("J9o5cuQAkeCWAfGsnE2qxRNAM1hbXCo7MTLxqyjecm1y");

// ── Contextos de cuentas ───────────────────────────────────────

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(init, payer = authority, space = 8 + Platform::INIT_SPACE, seeds = [PLATFORM_SEED], bump)]
    pub platform: Account<'info, Platform>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: fee destination — validado solo por su clave pública
    pub treasury: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(params: ix::create_project::CreateProjectParams)]
pub struct CreateProject<'info> {
    #[account(mut, seeds = [PLATFORM_SEED], bump = platform.bump)]
    pub platform: Account<'info, Platform>,
    #[account(
        init,
        payer = dev,
        space = 8 + Project::INIT_SPACE,
        seeds = [PROJECT_SEED, &platform.total_projects.to_le_bytes()],
        bump
    )]
    pub project: Account<'info, Project>,
    #[account(
        init,
        payer = dev,
        space = 8 + VaultAccount::INIT_SPACE,
        seeds = [VAULT_SEED, &platform.total_projects.to_le_bytes()],
        bump
    )]
    pub vault: Account<'info, VaultAccount>,
    #[account(
        init,
        payer = dev,
        mint::decimals = TOKEN_DECIMALS,
        mint::authority = project,
        mint::freeze_authority = project
    )]
    pub token_mint: Account<'info, Mint>,
    #[account(mut)]
    pub dev: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CastSocialVote<'info> {
    #[account(mut, seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()], bump = project.bump)]
    pub project: Account<'info, Project>,
    #[account(
        init,
        payer = voter,
        space = 8 + SocialVote::INIT_SPACE,
        seeds = [VOTE_SEED, &project.project_id.to_le_bytes(), voter.key().as_ref()],
        bump
    )]
    pub social_vote: Account<'info, SocialVote>,
    #[account(mut)]
    pub voter: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct OpenEconomicPhase<'info> {
    #[account(mut, seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()], bump = project.bump)]
    pub project: Account<'info, Project>,
    pub caller: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseSocialPhase<'info> {
    #[account(mut, seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()], bump = project.bump)]
    pub project: Account<'info, Project>,
    pub caller: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(amount_lamports: u64)]
pub struct Contribute<'info> {
    #[account(mut, seeds = [PLATFORM_SEED], bump = platform.bump)]
    pub platform: Account<'info, Platform>,
    #[account(mut, seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()], bump = project.bump)]
    pub project: Account<'info, Project>,
    #[account(
        init_if_needed,
        payer = contributor,
        space = 8 + Contribution::INIT_SPACE,
        seeds = [CONTRIBUTION_SEED, &project.project_id.to_le_bytes(), contributor.key().as_ref()],
        bump
    )]
    pub contribution: Account<'info, Contribution>,
    #[account(
        mut,
        seeds = [VAULT_SEED, &project.project_id.to_le_bytes()],
        bump = vault.bump,
        constraint = vault.project == project.key() @ QuorumError::VaultProjectMismatch
    )]
    pub vault: Account<'info, VaultAccount>,
    /// CHECK: tesorería de la plataforma — validada por constraint
    #[account(mut, constraint = treasury.key() == platform.treasury)]
    pub treasury: UncheckedAccount<'info>,
    #[account(mut)]
    pub contributor: Signer<'info>,
    /// CHECK: feed Pyth SOL/USD — validado en handler (edad, rango, owner)
    #[account(constraint = *price_feed.key == PYTH_SOL_USD_FEED @ QuorumError::InvalidPriceFeed)]
    pub price_feed: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EmitHealthCheck<'info> {
    #[account(mut, seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()], bump = project.bump)]
    pub project: Account<'info, Project>,
    /// CHECK: feed Pyth SOL/USD — validado en handler para milestone de fondeo
    #[account(constraint = *price_feed.key == PYTH_SOL_USD_FEED @ QuorumError::InvalidPriceFeed)]
    pub price_feed: AccountInfo<'info>,
    pub caller: Signer<'info>,
}

#[derive(Accounts)]
pub struct GraduateProject<'info> {
    #[account(mut, seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()], bump = project.bump)]
    pub project: Account<'info, Project>,
    #[account(
        seeds = [VAULT_SEED, &project.project_id.to_le_bytes()],
        bump = vault.bump,
        constraint = vault.project == project.key() @ QuorumError::VaultProjectMismatch
    )]
    pub vault: Account<'info, VaultAccount>,
    /// CHECK: feed Pyth SOL/USD — validado en handler (edad, rango, owner)
    #[account(constraint = *price_feed.key == PYTH_SOL_USD_FEED @ QuorumError::InvalidPriceFeed)]
    pub price_feed: AccountInfo<'info>,
    pub caller: Signer<'info>,
}

#[derive(Accounts)]
pub struct FinalizeFunding<'info> {
    #[account(mut, seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()], bump = project.bump)]
    pub project: Account<'info, Project>,
    pub caller: Signer<'info>,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()], bump = project.bump)]
    pub project: Account<'info, Project>,
    #[account(
        mut,
        seeds = [CONTRIBUTION_SEED, &project.project_id.to_le_bytes(), contributor.key().as_ref()],
        bump = contribution.bump,
        constraint = contribution.contributor == contributor.key()
    )]
    pub contribution: Account<'info, Contribution>,
    #[account(
        mut,
        seeds = [VAULT_SEED, &project.project_id.to_le_bytes()],
        bump = vault.bump,
        constraint = vault.project == project.key() @ QuorumError::VaultProjectMismatch
    )]
    pub vault: Account<'info, VaultAccount>,
    #[account(mut)]
    pub contributor: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterDevActivity<'info> {
    #[account(mut, seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()], bump = project.bump)]
    pub project: Account<'info, Project>,
    pub dev: Signer<'info>,
}

#[derive(Accounts)]
pub struct TriggerInactivity<'info> {
    #[account(mut, seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()], bump = project.bump)]
    pub project: Account<'info, Project>,
    pub caller: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimTokens<'info> {
    #[account(seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()], bump = project.bump)]
    pub project: Account<'info, Project>,
    #[account(
        mut,
        seeds = [CONTRIBUTION_SEED, &project.project_id.to_le_bytes(), contributor.key().as_ref()],
        bump = contribution.bump,
        constraint = contribution.contributor == contributor.key()
    )]
    pub contribution: Account<'info, Contribution>,
    #[account(mut, constraint = token_mint.key() == project.token_mint)]
    pub token_mint: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = contributor,
        associated_token::mint = token_mint,
        associated_token::authority = contributor,
    )]
    pub contributor_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub contributor: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseVault<'info> {
    #[account(seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()], bump = project.bump)]
    pub project: Account<'info, Project>,
    #[account(
        mut,
        seeds = [VAULT_SEED, &project.project_id.to_le_bytes()],
        bump = vault.bump,
        constraint = vault.project == project.key() @ QuorumError::VaultProjectMismatch,
        close = caller
    )]
    pub vault: Account<'info, VaultAccount>,
    #[account(mut)]
    pub caller: Signer<'info>,
}

// ── Instrucciones ──────────────────────────────────────────────

#[program]
pub mod quorum {
    use super::*;

    pub fn initialize_platform(ctx: Context<InitializePlatform>) -> Result<()> {
        ix::initialize_platform::handler(ctx)
    }

    pub fn create_project(ctx: Context<CreateProject>, params: ix::create_project::CreateProjectParams) -> Result<()> {
        ix::create_project::handler(ctx, params)
    }

    pub fn cast_social_vote(ctx: Context<CastSocialVote>) -> Result<()> {
        ix::social_vote::handler(ctx)
    }

    pub fn open_economic_phase(ctx: Context<OpenEconomicPhase>) -> Result<()> {
        ix::social_vote::open_economic_phase(ctx)
    }

    pub fn close_social_phase(ctx: Context<CloseSocialPhase>) -> Result<()> {
        ix::social_vote::close_social_phase(ctx)
    }

    pub fn contribute(ctx: Context<Contribute>, amount_lamports: u64) -> Result<()> {
        ix::contribute::handler(ctx, amount_lamports)
    }

    pub fn emit_health_check(ctx: Context<EmitHealthCheck>) -> Result<()> {
        ix::social_vote::emit_health_check(ctx)
    }

    pub fn graduate_project(ctx: Context<GraduateProject>) -> Result<()> {
        ix::graduate_project::handler(ctx)
    }

    pub fn finalize_funding(ctx: Context<FinalizeFunding>) -> Result<()> {
        ix::finalize_funding::handler(ctx)
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        ix::refund::handler(ctx)
    }

    pub fn register_dev_activity(ctx: Context<RegisterDevActivity>) -> Result<()> {
        ix::dev_activity::handler(ctx)
    }

    pub fn trigger_inactivity(ctx: Context<TriggerInactivity>) -> Result<()> {
        ix::dev_activity::trigger_inactivity(ctx)
    }

    pub fn claim_tokens(ctx: Context<ClaimTokens>) -> Result<()> {
        ix::claim_tokens::handler(ctx)
    }

    pub fn close_vault(ctx: Context<CloseVault>) -> Result<()> {
        ix::close_vault::handler(ctx)
    }
}
