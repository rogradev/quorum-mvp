use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};
use crate::state::{Platform, Project, ProjectState};
use crate::constants::*;
use crate::errors::QuorumError;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateProjectParams {
    pub name: String,
    pub ticker: String,
    pub description: String,
    pub website_url: String,
    pub raise_goal: u64,
}

/// El dev crea un proyecto. Se mintea el token SPL y arranca la fase social.
pub fn handler(ctx: Context<CreateProject>, params: CreateProjectParams) -> Result<()> {
    // Validaciones básicas
    require!(!params.name.is_empty(), QuorumError::EmptyName);
    require!(!params.ticker.is_empty(), QuorumError::EmptyTicker);
    require!(!params.description.is_empty(), QuorumError::EmptyDescription);
    require!(params.raise_goal >= MIN_RAISE_LAMPORTS, QuorumError::RaiseTooLow);

    let platform = &mut ctx.accounts.platform;
    let project = &mut ctx.accounts.project;
    let now = Clock::get()?.unix_timestamp;

    project.dev = ctx.accounts.dev.key();
    project.token_mint = ctx.accounts.token_mint.key();
    project.project_id = platform.total_projects;
    project.name = params.name;
    project.ticker = params.ticker;
    project.description = params.description;
    project.website_url = params.website_url;
    project.state = ProjectState::SocialVoting;
    project.social_vote_start = now;
    project.social_votes = 0;
    // Fase económica — abre al Día 15 via open_economic_phase()
    project.economic_phase_active = false;
    project.economic_phase_open = 0;
    project.raise_goal = params.raise_goal;
    project.total_raised = 0;
    project.holder_count = 0;
    project.platform_fee_paid = 0;
    // Health checks trimestrales
    project.health_check_1_emitted = false;
    project.health_check_2_emitted = false;
    // Vesting — se activa al Día 15 via open_economic_phase()
    project.vesting_start = 0;
    project.vesting_end = 0;
    project.last_dev_activity = now;
    project.dev_locked = false;
    project.bump = ctx.bumps.project;

    platform.total_projects = platform
        .total_projects
        .checked_add(1)
        .ok_or(QuorumError::ArithmeticOverflow)?;

    emit!(ProjectCreated {
        project_id: project.project_id,
        dev: project.dev,
        name: project.name.clone(),
        ticker: project.ticker.clone(),
        raise_goal: project.raise_goal,
        social_vote_start: now,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(params: CreateProjectParams)]
pub struct CreateProject<'info> {
    #[account(
        mut,
        seeds = [PLATFORM_SEED],
        bump = platform.bump
    )]
    pub platform: Account<'info, Platform>,

    #[account(
        init,
        payer = dev,
        space = 8 + Project::INIT_SPACE,
        seeds = [PROJECT_SEED, &platform.total_projects.to_le_bytes()],
        bump
    )]
    pub project: Account<'info, Project>,

    /// El token SPL del proyecto — se inicializa aquí
    #[account(
        init,
        payer = dev,
        mint::decimals = TOKEN_DECIMALS,
        mint::authority = project,
        mint::freeze_authority = project,
    )]
    pub token_mint: Account<'info, Mint>,

    #[account(mut)]
    pub dev: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[event]
pub struct ProjectCreated {
    pub project_id: u64,
    pub dev: Pubkey,
    pub name: String,
    pub ticker: String,
    pub raise_goal: u64,
    pub social_vote_start: i64,
}
