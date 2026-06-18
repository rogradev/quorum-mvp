use anchor_lang::prelude::*;
use pyth_sdk_solana::state::SolanaPriceAccount;
use crate::constants::{MAX_PRICE_AGE_SECS, MIN_SOL_PRICE_USD, MAX_SOL_PRICE_USD};
use crate::errors::QuorumError;

const LAMPORTS_PER_SOL: u64 = 1_000_000_000;

/// Carga el feed de Pyth, valida la edad del precio y lo convierte a USD enteros.
/// Devuelve el precio de SOL en USD (ej: 150 para $150.00).
pub fn get_sol_price_usd(price_feed_info: &AccountInfo, now: i64) -> Result<u64> {
    let feed = SolanaPriceAccount::account_info_to_feed(price_feed_info)
        .map_err(|_| error!(QuorumError::InvalidPriceFeed))?;

    let price = feed
        .get_price_no_older_than(now, MAX_PRICE_AGE_SECS)
        .ok_or(error!(QuorumError::StalePriceFeed))?;

    // price.price puede ser negativo en casos de error del feed
    require!(price.price > 0, QuorumError::InvalidPriceFeed);

    let raw_price = price.price as u64;
    let expo = price.expo; // negativo para feeds USD (ej: -8)

    // Convertir a USD enteros: raw_price × 10^expo
    let sol_price_usd: u64 = if expo < 0 {
        let divisor = 10u64
            .checked_pow((-expo) as u32)
            .ok_or(error!(QuorumError::ArithmeticOverflow))?;
        raw_price
            .checked_div(divisor)
            .ok_or(error!(QuorumError::ArithmeticOverflow))?
    } else {
        let multiplier = 10u64
            .checked_pow(expo as u32)
            .ok_or(error!(QuorumError::ArithmeticOverflow))?;
        raw_price
            .checked_mul(multiplier)
            .ok_or(error!(QuorumError::ArithmeticOverflow))?
    };

    require!(sol_price_usd >= MIN_SOL_PRICE_USD, QuorumError::PriceOutOfRange);
    require!(sol_price_usd <= MAX_SOL_PRICE_USD, QuorumError::PriceOutOfRange);

    Ok(sol_price_usd)
}

/// Convierte una cantidad en USD a lamports usando el precio actual de SOL.
/// lamports = usd_amount × LAMPORTS_PER_SOL / sol_price_usd
pub fn usd_to_lamports(usd_amount: u64, sol_price_usd: u64) -> Result<u64> {
    let lamports = (usd_amount as u128)
        .checked_mul(LAMPORTS_PER_SOL as u128)
        .ok_or(error!(QuorumError::ArithmeticOverflow))?
        .checked_div(sol_price_usd as u128)
        .ok_or(error!(QuorumError::ArithmeticOverflow))?;

    u64::try_from(lamports).map_err(|_| error!(QuorumError::ArithmeticOverflow))
}
