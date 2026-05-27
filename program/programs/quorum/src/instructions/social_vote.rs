use anchor_lang::prelude::*;
use crate::state::{Project, ProjectState, SocialVote};
use crate::constants::*;
use crate::errors::QuorumError;

/// Cualquier wallet vota en la fase social.
/// Sin requisitos económicos — es una señal de interés puro.
/// La fase social dura 30 días desde el Día 1.
pub fn handler(ctx: Context<CastSocialVote>) -> Result<()> {
    let project = &mut ctx.accounts.project;
    let now = Clock::get()?.unix_timestamp;

    // La fase social acepta votos mientras esté en SocialVoting
    require!(
        project.state == ProjectState::SocialVoting,
        QuorumError::SocialVoteNotActive
    );

    // Verificar que los 30 días no hayan expirado
    let vote_deadline = project
        .social_vote_start
        .checked_add(SOCIAL_VOTE_DURATION_SECS)
        .ok_or(QuorumError::ArithmeticOverflow)?;

    require!(now <= vote_deadline, QuorumError::SocialVoteNotActive);

    // Registrar el voto — el PDA previene votar dos veces
    let vote = &mut ctx.accounts.social_vote;
    vote.project_id = project.project_id;
    vote.voter = ctx.accounts.voter.key();
    vote.voted_at = now;
    vote.bump = ctx.bumps.social_vote;

    project.social_votes = project
        .social_votes
        .checked_add(1)
        .ok_or(QuorumError::ArithmeticOverflow)?;

    emit!(SocialVoteCast {
        project_id: project.project_id,
        voter: ctx.accounts.voter.key(),
        total_votes: project.social_votes,
    });

    Ok(())
}

/// Abre la fase económica al Día 15 — EN PARALELO con la votación social.
/// REGLA HARD: el vesting empieza simultáneamente con el primer dólar.
/// Cualquiera puede llamar esto una vez que pasen 15 días.
pub fn open_economic_phase(ctx: Context<OpenEconomicPhase>) -> Result<()> {
    let project = &mut ctx.accounts.project;
    let now = Clock::get()?.unix_timestamp;

    // Solo aplica si estamos en la fase social y la económica no está abierta aún
    require!(
        project.state == ProjectState::SocialVoting,
        QuorumError::InvalidProjectState
    );

    require!(
        !project.economic_phase_active,
        QuorumError::InvalidProjectState
    );

    // Verificar que han pasado al menos 15 días desde el inicio
    let day_15 = project
        .social_vote_start
        .checked_add(ECONOMIC_PHASE_OPEN_DAY_SECS)
        .ok_or(QuorumError::ArithmeticOverflow)?;

    require!(now >= day_15, QuorumError::EconomicPhaseNotActive);

    // Abrir la fase económica — el estado sigue siendo SocialVoting
    // Ambas fases corren en paralelo hasta el Día 30
    project.economic_phase_active = true;
    project.economic_phase_open = now;

    // El vesting empieza cuando abre la fase económica (Día 15)
    project.vesting_start = now;
    project.vesting_end = now
        .checked_add(ECONOMIC_PHASE_DURATION_SECS)
        .ok_or(QuorumError::ArithmeticOverflow)?;

    emit!(EconomicPhaseOpened {
        project_id: project.project_id,
        opened_at: now,
        vesting_end: project.vesting_end,
        social_votes_at_opening: project.social_votes,
    });

    Ok(())
}

/// Cierra la fase social al Día 30.
/// La fase económica continúa abierta hasta el Día 284.
/// Cualquiera puede llamar esto una vez que pasen los 30 días.
pub fn close_social_phase(ctx: Context<CloseSocialPhase>) -> Result<()> {
    let project = &mut ctx.accounts.project;
    let now = Clock::get()?.unix_timestamp;

    require!(
        project.state == ProjectState::SocialVoting,
        QuorumError::SocialVoteNotActive
    );

    let vote_deadline = project
        .social_vote_start
        .checked_add(SOCIAL_VOTE_DURATION_SECS)
        .ok_or(QuorumError::ArithmeticOverflow)?;

    require!(now > vote_deadline, QuorumError::SocialVoteNotEnded);

    // Transicionar a EconomicPhase — la fase económica ya debería estar activa
    project.state = ProjectState::EconomicPhase;

    emit!(SocialPhaseClosed {
        project_id: project.project_id,
        final_votes: project.social_votes,
        closed_at: now,
        economic_phase_active: project.economic_phase_active,
    });

    Ok(())
}

/// Emite los indicadores de salud trimestrales (informativos, no bloqueantes).
/// Cualquiera puede llamar esto en el Mes 3 y Mes 6.
pub fn emit_health_check(ctx: Context<EmitHealthCheck>) -> Result<()> {
    let project = &mut ctx.accounts.project;
    let now = Clock::get()?.unix_timestamp;

    require!(
        project.economic_phase_active,
        QuorumError::EconomicPhaseNotActive
    );

    let elapsed = now
        .checked_sub(project.economic_phase_open)
        .ok_or(QuorumError::ArithmeticOverflow)?;

    // Health check Mes 3
    if elapsed >= HEALTH_CHECK_1_SECS && !project.health_check_1_emitted {
        let target = project.raise_goal
            .checked_mul(HEALTH_CHECK_1_TARGET_BPS)
            .ok_or(QuorumError::ArithmeticOverflow)?
            .checked_div(10_000)
            .ok_or(QuorumError::ArithmeticOverflow)?;

        let on_track = project.total_raised >= target;

        project.health_check_1_emitted = true;

        emit!(HealthCheckEmitted {
            project_id: project.project_id,
            check_number: 1,
            total_raised: project.total_raised,
            target_amount: target,
            holder_count: project.holder_count,
            on_track,
            checked_at: now,
        });
    }

    // Health check Mes 6
    if elapsed >= HEALTH_CHECK_2_SECS && !project.health_check_2_emitted {
        let target = project.raise_goal
            .checked_mul(HEALTH_CHECK_2_TARGET_BPS)
            .ok_or(QuorumError::ArithmeticOverflow)?
            .checked_div(10_000)
            .ok_or(QuorumError::ArithmeticOverflow)?;

        let on_track = project.total_raised >= target;

        project.health_check_2_emitted = true;

        emit!(HealthCheckEmitted {
            project_id: project.project_id,
            check_number: 2,
            total_raised: project.total_raised,
            target_amount: target,
            holder_count: project.holder_count,
            on_track,
            checked_at: now,
        });
    }

    Ok(())
}

// ── Structs de cuentas ─────────────────────────────────────

#[derive(Accounts)]
pub struct CastSocialVote<'info> {
    #[account(
        mut,
        seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()],
        bump = project.bump
    )]
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
    #[account(
        mut,
        seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()],
        bump = project.bump
    )]
    pub project: Account<'info, Project>,

    /// Permissionless — cualquiera puede activar esto al Día 15
    pub caller: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseSocialPhase<'info> {
    #[account(
        mut,
        seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()],
        bump = project.bump
    )]
    pub project: Account<'info, Project>,

    /// Permissionless — cualquiera puede cerrar la fase social al Día 30
    pub caller: Signer<'info>,
}

#[derive(Accounts)]
pub struct EmitHealthCheck<'info> {
    #[account(
        mut,
        seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()],
        bump = project.bump
    )]
    pub project: Account<'info, Project>,

    /// Permissionless — cualquiera puede emitir el health check
    pub caller: Signer<'info>,
}

// ── Eventos ────────────────────────────────────────────────

#[event]
pub struct SocialVoteCast {
    pub project_id: u64,
    pub voter: Pubkey,
    pub total_votes: u64,
}

#[event]
pub struct EconomicPhaseOpened {
    pub project_id: u64,
    pub opened_at: i64,
    pub vesting_end: i64,
    pub social_votes_at_opening: u64,
}

#[event]
pub struct SocialPhaseClosed {
    pub project_id: u64,
    pub final_votes: u64,
    pub closed_at: i64,
    pub economic_phase_active: bool,
}

#[event]
pub struct HealthCheckEmitted {
    pub project_id: u64,
    pub check_number: u8,
    pub total_raised: u64,
    pub target_amount: u64,
    pub holder_count: u64,
    pub on_track: bool,
    pub checked_at: i64,
}
