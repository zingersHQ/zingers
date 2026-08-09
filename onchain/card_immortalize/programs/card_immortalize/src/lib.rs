//! Lean Card Immortalize — burn fuel + mint unique SPL card (decimals 0, supply 1).
//! Mint authority = program PDA. No Metaplex / no Token-2022 (small binary).
//! Off-chain JSON at /api/cars/card/[mint] for display.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    program::{invoke, invoke_signed},
    program_option::COption,
    program_pack::Pack,
    system_instruction,
    sysvar::instructions::{
        load_current_index_checked, load_instruction_at_checked, ID as IX_SYSVAR_ID,
    },
};
use spl_token::{
    instruction::{
        burn, initialize_account3, initialize_mint2, mint_to,
        set_authority as spl_set_authority, AuthorityType,
    },
    state::{Account as TokenAcc, Mint},
    ID as TOKEN_PROGRAM_ID,
};

declare_id!("FNjvsSSqg8VcEuvRpXT1BjGWFe2BWwiQHo6qjoSUme3U");

pub const VOUCHER_PREFIX: &[u8] = b"card_immortalize_v1";
pub const ED25519_PROGRAM_ID: Pubkey = pubkey!("Ed25519SigVerify111111111111111111111111111");
/// Token-2022 program — accepted for *fuel* burn only (pump.fun mints).
/// Cards still mint under classic SPL Token (keeps .so small).
pub const TOKEN_2022_PROGRAM_ID: Pubkey = pubkey!("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

#[program]
pub mod card_immortalize {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        max_per_mind: u16,
        fuel_decimals: u8,
    ) -> Result<()> {
        require!(max_per_mind > 0 && max_per_mind <= 64, ImmError::BadMax);
        let fuel = unpack_fuel_mint(&ctx.accounts.fuel_mint)?;
        require!(fuel.decimals == fuel_decimals, ImmError::BadDecimals);

        let cfg = &mut ctx.accounts.config;
        cfg.authority = ctx.accounts.authority.key();
        cfg.voucher_issuer = ctx.accounts.voucher_issuer.key();
        cfg.fuel_mint = ctx.accounts.fuel_mint.key();
        cfg.max_per_mind = max_per_mind;
        cfg.fuel_decimals = fuel_decimals;
        cfg.paused = 0;
        cfg.bump = ctx.bumps.config;
        cfg.mint_authority_bump = ctx.bumps.mint_authority;
        cfg.reserved = [0u8; 32];
        Ok(())
    }

    pub fn set_paused(ctx: Context<Admin>, paused: bool) -> Result<()> {
        ctx.accounts.config.paused = u8::from(paused);
        Ok(())
    }

    pub fn set_voucher_issuer(ctx: Context<Admin>, new_issuer: Pubkey) -> Result<()> {
        ctx.accounts.config.voucher_issuer = new_issuer;
        Ok(())
    }

    pub fn set_max_per_mind(ctx: Context<Admin>, max_per_mind: u16) -> Result<()> {
        require!(max_per_mind > 0 && max_per_mind <= 64, ImmError::BadMax);
        ctx.accounts.config.max_per_mind = max_per_mind;
        Ok(())
    }

    pub fn set_authority(ctx: Context<Admin>, new_authority: Pubkey) -> Result<()> {
        ctx.accounts.config.authority = new_authority;
        Ok(())
    }

    pub fn immortalize(
        ctx: Context<Immortalize>,
        mind_hash: [u8; 32],
        burn_amount: u64,
        mint_index: u16,
        year: u32,
        genesis: u8,
        exp: i64,
        nonce: [u8; 16],
        meta_hash: [u8; 32],
    ) -> Result<()> {
        let cfg = &ctx.accounts.config;
        require!(cfg.paused == 0, ImmError::Paused);
        require!(burn_amount > 0, ImmError::BadBurn);
        require!(year >= 1, ImmError::BadCounter);
        require!(genesis <= 1, ImmError::BadGenesis);
        require_keys_eq!(ctx.accounts.fuel_mint.key(), cfg.fuel_mint);
        // Cards always use classic Token; fuel may be Token or Token-2022.
        require_keys_eq!(*ctx.accounts.token_program.key, TOKEN_PROGRAM_ID);

        let fuel_program = *ctx.accounts.fuel_mint.owner;
        require!(
            fuel_program == TOKEN_PROGRAM_ID || fuel_program == TOKEN_2022_PROGRAM_ID,
            ImmError::BadTokenAccount
        );
        require_keys_eq!(*ctx.accounts.owner_fuel_ata.owner, fuel_program);

        let fuel_mint = unpack_fuel_mint(&ctx.accounts.fuel_mint)?;
        require!(fuel_mint.decimals == cfg.fuel_decimals, ImmError::BadDecimals);

        let fuel_ata = unpack_fuel_token(&ctx.accounts.owner_fuel_ata)?;
        require_keys_eq!(fuel_ata.mint, cfg.fuel_mint);
        require_keys_eq!(fuel_ata.owner, ctx.accounts.owner.key());
        require!(fuel_ata.amount >= burn_amount, ImmError::BadBurn);

        let clock = Clock::get()?;
        require!(clock.unix_timestamp <= exp, ImmError::VoucherExpired);

        let message = build_voucher_message(
            &ctx.accounts.owner.key(),
            &mind_hash,
            burn_amount,
            mint_index,
            year,
            genesis,
            exp,
            &nonce,
            &meta_hash,
        );
        verify_ed25519_ix(
            &ctx.accounts.instructions_sysvar,
            cfg.voucher_issuer.as_ref(),
            &message,
        )?;

        let counter = &mut ctx.accounts.mind_counter;
        let fresh = counter.count == 0 && counter.mind_hash == [0u8; 32];
        if fresh {
            counter.mind_hash = mind_hash;
            counter.year = year;
            counter.bump = ctx.bumps.mind_counter;
        } else {
            require!(
                counter.mind_hash == mind_hash && counter.year == year,
                ImmError::BadCounter
            );
        }
        require!(counter.count < cfg.max_per_mind, ImmError::MindFull);
        require!(
            mint_index == counter.count.saturating_add(1),
            ImmError::BadMintIndex
        );

        // Burn fuel (same wire format for Token + Token-2022).
        invoke(
            &burn(
                &fuel_program,
                ctx.accounts.owner_fuel_ata.key,
                ctx.accounts.fuel_mint.key,
                ctx.accounts.owner.key,
                &[],
                burn_amount,
            )?,
            &[
                ctx.accounts.owner_fuel_ata.to_account_info(),
                ctx.accounts.fuel_mint.to_account_info(),
                ctx.accounts.owner.to_account_info(),
            ],
        )?;

        let seeds: &[&[u8]] = &[b"mint_authority", &[cfg.mint_authority_bump]];
        let signer = &[seeds];
        let rent = Rent::get()?;
        let mint_lamports = rent.minimum_balance(Mint::LEN);
        let ata_lamports = rent.minimum_balance(TokenAcc::LEN);

        // Create card mint (owner pays; mint keypair signs).
        invoke(
            &system_instruction::create_account(
                ctx.accounts.owner.key,
                ctx.accounts.card_mint.key,
                mint_lamports,
                Mint::LEN as u64,
                &TOKEN_PROGRAM_ID,
            ),
            &[
                ctx.accounts.owner.to_account_info(),
                ctx.accounts.card_mint.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        invoke(
            &initialize_mint2(
                &TOKEN_PROGRAM_ID,
                ctx.accounts.card_mint.key,
                ctx.accounts.mint_authority.key,
                Some(ctx.accounts.mint_authority.key),
                0,
            )?,
            &[
                ctx.accounts.card_mint.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
            ],
        )?;

        // Create owner card token account.
        invoke(
            &system_instruction::create_account(
                ctx.accounts.owner.key,
                ctx.accounts.owner_card_ata.key,
                ata_lamports,
                TokenAcc::LEN as u64,
                &TOKEN_PROGRAM_ID,
            ),
            &[
                ctx.accounts.owner.to_account_info(),
                ctx.accounts.owner_card_ata.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        invoke(
            &initialize_account3(
                &TOKEN_PROGRAM_ID,
                ctx.accounts.owner_card_ata.key,
                ctx.accounts.card_mint.key,
                ctx.accounts.owner.key,
            )?,
            &[
                ctx.accounts.owner_card_ata.to_account_info(),
                ctx.accounts.card_mint.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
            ],
        )?;

        // Mint 1 + revoke mint/freeze authority.
        invoke_signed(
            &mint_to(
                &TOKEN_PROGRAM_ID,
                ctx.accounts.card_mint.key,
                ctx.accounts.owner_card_ata.key,
                ctx.accounts.mint_authority.key,
                &[],
                1,
            )?,
            &[
                ctx.accounts.card_mint.to_account_info(),
                ctx.accounts.owner_card_ata.to_account_info(),
                ctx.accounts.mint_authority.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
            ],
            signer,
        )?;
        invoke_signed(
            &spl_set_authority(
                &TOKEN_PROGRAM_ID,
                ctx.accounts.card_mint.key,
                None,
                AuthorityType::MintTokens,
                ctx.accounts.mint_authority.key,
                &[],
            )?,
            &[
                ctx.accounts.card_mint.to_account_info(),
                ctx.accounts.mint_authority.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
            ],
            signer,
        )?;
        invoke_signed(
            &spl_set_authority(
                &TOKEN_PROGRAM_ID,
                ctx.accounts.card_mint.key,
                None,
                AuthorityType::FreezeAccount,
                ctx.accounts.mint_authority.key,
                &[],
            )?,
            &[
                ctx.accounts.card_mint.to_account_info(),
                ctx.accounts.mint_authority.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
            ],
            signer,
        )?;

        // Post-conditions: unique SPL card.
        let card = unpack_mint(&ctx.accounts.card_mint)?;
        require!(card.decimals == 0, ImmError::BadCardMint);
        require!(card.supply == 1, ImmError::BadCardMint);
        require!(card.mint_authority == COption::None, ImmError::BadCardMint);
        require!(card.freeze_authority == COption::None, ImmError::BadCardMint);

        let stamp = &mut ctx.accounts.career_stamp;
        stamp.owner = ctx.accounts.owner.key();
        stamp.mind_hash = mind_hash;
        stamp.card_mint = ctx.accounts.card_mint.key();
        stamp.mint_index = mint_index;
        stamp.year = year;
        stamp.genesis = genesis;
        stamp.burn_amount = burn_amount;
        stamp.meta_hash = meta_hash;
        stamp.bump = ctx.bumps.career_stamp;

        counter.count = counter.count.saturating_add(1);

        let used = &mut ctx.accounts.voucher_used;
        used.nonce = nonce;
        used.owner = ctx.accounts.owner.key();
        used.bump = ctx.bumps.voucher_used;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: voucher issuer pubkey only
    pub voucher_issuer: UncheckedAccount<'info>,
    /// CHECK: validated as SPL Mint in handler
    pub fuel_mint: UncheckedAccount<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + Config::SIZE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    /// CHECK: PDA mint authority
    #[account(seeds = [b"mint_authority"], bump)]
    pub mint_authority: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Admin<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = authority @ ImmError::BadAdmin
    )]
    pub config: Account<'info, Config>,
}

#[derive(Accounts)]
#[instruction(
    mind_hash: [u8; 32],
    burn_amount: u64,
    mint_index: u16,
    year: u32,
    genesis: u8,
    exp: i64,
    nonce: [u8; 16],
    meta_hash: [u8; 32]
)]
pub struct Immortalize<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,

    /// CHECK: PDA mint authority
    #[account(seeds = [b"mint_authority"], bump = config.mint_authority_bump)]
    pub mint_authority: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + MindCounter::SIZE,
        seeds = [b"mind", &year.to_le_bytes(), mind_hash.as_ref()],
        bump
    )]
    pub mind_counter: Account<'info, MindCounter>,

    #[account(
        init,
        payer = owner,
        space = 8 + CareerStamp::SIZE,
        seeds = [
            b"career",
            owner.key().as_ref(),
            &year.to_le_bytes(),
            mind_hash.as_ref(),
            &mint_index.to_le_bytes()
        ],
        bump
    )]
    pub career_stamp: Account<'info, CareerStamp>,

    #[account(
        init,
        payer = owner,
        space = 8 + VoucherUsed::SIZE,
        seeds = [b"voucher", nonce.as_ref()],
        bump
    )]
    pub voucher_used: Account<'info, VoucherUsed>,

    /// CHECK: must match config.fuel_mint; unpacked in handler
    #[account(mut, address = config.fuel_mint)]
    pub fuel_mint: UncheckedAccount<'info>,

    /// CHECK: owner fuel ATA; unpacked in handler
    #[account(mut)]
    pub owner_fuel_ata: UncheckedAccount<'info>,

    /// Fresh mint keypair — created + initialized in handler
    #[account(mut)]
    pub card_mint: Signer<'info>,

    /// Fresh token account keypair — created + initialized in handler
    #[account(mut)]
    pub owner_card_ata: Signer<'info>,

    /// CHECK: instructions sysvar
    #[account(address = IX_SYSVAR_ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,

    /// CHECK: classic SPL Token program
    #[account(address = TOKEN_PROGRAM_ID)]
    pub token_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Config {
    pub authority: Pubkey,
    pub voucher_issuer: Pubkey,
    pub fuel_mint: Pubkey,
    pub max_per_mind: u16,
    pub fuel_decimals: u8,
    pub paused: u8,
    pub bump: u8,
    pub mint_authority_bump: u8,
    /// Forward-compat (version flags, fee bps, etc.). Keep zeroed.
    pub reserved: [u8; 32],
}
impl Config {
    pub const SIZE: usize = 32 + 32 + 32 + 2 + 1 + 1 + 1 + 1 + 32;
}

#[account]
pub struct MindCounter {
    pub mind_hash: [u8; 32],
    pub year: u32,
    pub count: u16,
    pub bump: u8,
}
impl MindCounter {
    pub const SIZE: usize = 32 + 4 + 2 + 1;
}

#[account]
pub struct CareerStamp {
    pub owner: Pubkey,
    pub mind_hash: [u8; 32],
    pub card_mint: Pubkey,
    pub mint_index: u16,
    pub year: u32,
    pub genesis: u8,
    pub burn_amount: u64,
    pub meta_hash: [u8; 32],
    pub bump: u8,
}
impl CareerStamp {
    pub const SIZE: usize = 32 + 32 + 32 + 2 + 4 + 1 + 8 + 32 + 1;
}

#[account]
pub struct VoucherUsed {
    pub nonce: [u8; 16],
    pub owner: Pubkey,
    pub bump: u8,
}
impl VoucherUsed {
    pub const SIZE: usize = 16 + 32 + 1;
}

#[error_code]
pub enum ImmError {
    #[msg("Invalid max_per_mind")]
    BadMax,
    #[msg("Fuel decimals mismatch")]
    BadDecimals,
    #[msg("Invalid burn amount")]
    BadBurn,
    #[msg("Invalid genesis flag")]
    BadGenesis,
    #[msg("Voucher expired")]
    VoucherExpired,
    #[msg("Ed25519 voucher missing or invalid")]
    BadEd25519,
    #[msg("Mind Immortal slots full")]
    MindFull,
    #[msg("mint_index must be count+1")]
    BadMintIndex,
    #[msg("Mind counter mismatch")]
    BadCounter,
    #[msg("Program paused")]
    Paused,
    #[msg("Bad admin authority")]
    BadAdmin,
    #[msg("Bad SPL token account")]
    BadTokenAccount,
    #[msg("Card mint post-condition failed")]
    BadCardMint,
}

fn is_token_program(owner: &Pubkey) -> bool {
    *owner == TOKEN_PROGRAM_ID || *owner == TOKEN_2022_PROGRAM_ID
}

/// Base mint layout is shared between classic Token and Token-2022 (first Mint::LEN bytes).
fn unpack_fuel_mint(ai: &AccountInfo) -> Result<Mint> {
    require!(is_token_program(ai.owner), ImmError::BadTokenAccount);
    let data = ai.data.borrow();
    require!(data.len() >= Mint::LEN, ImmError::BadTokenAccount);
    Mint::unpack_from_slice(&data[..Mint::LEN]).map_err(|_| error!(ImmError::BadTokenAccount))
}

fn unpack_fuel_token(ai: &AccountInfo) -> Result<TokenAcc> {
    require!(is_token_program(ai.owner), ImmError::BadTokenAccount);
    let data = ai.data.borrow();
    require!(data.len() >= TokenAcc::LEN, ImmError::BadTokenAccount);
    TokenAcc::unpack_from_slice(&data[..TokenAcc::LEN])
        .map_err(|_| error!(ImmError::BadTokenAccount))
}

fn unpack_mint(ai: &AccountInfo) -> Result<Mint> {
    require_keys_eq!(*ai.owner, TOKEN_PROGRAM_ID, ImmError::BadTokenAccount);
    Mint::unpack(&ai.data.borrow()).map_err(|_| error!(ImmError::BadTokenAccount))
}

fn build_voucher_message(
    owner: &Pubkey,
    mind_hash: &[u8; 32],
    burn_amount: u64,
    mint_index: u16,
    year: u32,
    genesis: u8,
    exp: i64,
    nonce: &[u8; 16],
    meta_hash: &[u8; 32],
) -> Vec<u8> {
    let mut m = Vec::with_capacity(128);
    m.extend_from_slice(VOUCHER_PREFIX);
    m.extend_from_slice(owner.as_ref());
    m.extend_from_slice(mind_hash);
    m.extend_from_slice(&burn_amount.to_le_bytes());
    m.extend_from_slice(&mint_index.to_le_bytes());
    m.extend_from_slice(&year.to_le_bytes());
    m.push(genesis);
    m.extend_from_slice(&exp.to_le_bytes());
    m.extend_from_slice(nonce);
    m.extend_from_slice(meta_hash);
    m
}

fn verify_ed25519_ix(
    instructions_sysvar: &AccountInfo,
    expected_pubkey: &[u8],
    message: &[u8],
) -> Result<()> {
    let current = load_current_index_checked(instructions_sysvar)
        .map_err(|_| error!(ImmError::BadEd25519))?;
    require!(current > 0, ImmError::BadEd25519);

    for i in 0..current {
        let ix = match load_instruction_at_checked(i as usize, instructions_sysvar) {
            Ok(ix) => ix,
            Err(_) => continue,
        };
        if ix.program_id != ED25519_PROGRAM_ID {
            continue;
        }
        let data = &ix.data;
        if data.len() < 16 + 32 + 64 || data[0] != 1 {
            continue;
        }
        let sig_offset = u16::from_le_bytes([data[2], data[3]]) as usize;
        let pubkey_offset = u16::from_le_bytes([data[6], data[7]]) as usize;
        let msg_offset = u16::from_le_bytes([data[10], data[11]]) as usize;
        let msg_size = u16::from_le_bytes([data[12], data[13]]) as usize;
        if data.len() < pubkey_offset + 32
            || data.len() < sig_offset + 64
            || data.len() < msg_offset + msg_size
            || msg_size != message.len()
        {
            continue;
        }
        if &data[pubkey_offset..pubkey_offset + 32] != expected_pubkey {
            continue;
        }
        if &data[msg_offset..msg_offset + msg_size] != message {
            continue;
        }
        return Ok(());
    }
    err!(ImmError::BadEd25519)
}
