use anchor_lang::prelude::*;
use crate::InitializePlatform;

pub fn handler(ctx: Context<InitializePlatform>) -> Result<()> {
    let platform = &mut ctx.accounts.platform;
    platform.authority = ctx.accounts.authority.key();
    platform.treasury = ctx.accounts.treasury.key();
    platform.total_projects = 0;
    platform.total_fees_collected = 0;
    platform.bump = ctx.bumps.platform;
    Ok(())
}
