use anchor_lang::prelude::*;
use crate::state::Platform;
use crate::constants::PLATFORM_SEED;

/// Inicializa el estado global de la plataforma.
/// Solo se llama una vez al deployar.
pub fn handler(ctx: Context<InitializePlatform>) -> Result<()> {
    let platform = &mut ctx.accounts.platform;
    platform.authority = ctx.accounts.authority.key();
    platform.treasury = ctx.accounts.treasury.key();
    platform.total_projects = 0;
    platform.total_fees_collected = 0;
    platform.bump = ctx.bumps.platform;
    Ok(())
}

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Platform::INIT_SPACE,
        seeds = [PLATFORM_SEED],
        bump
    )]
    pub platform: Account<'info, Platform>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: Es solo una wallet destino de fees
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}
