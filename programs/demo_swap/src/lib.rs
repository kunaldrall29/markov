use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("3HwcGXdsbfaAov2rYhDtnyeeEbuFVXUaT5GASTCjUUSK");

#[program]
pub mod demo_swap {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, rate_num: u64, rate_den: u64, fee_bps: u16) -> Result<()> {
        require!(rate_den > 0, SwapError::InvalidRate);
        require!(fee_bps <= 1_000, SwapError::InvalidFee);
        let pool = &mut ctx.accounts.pool;
        pool.authority = ctx.accounts.authority.key();
        pool.mint_a = ctx.accounts.mint_a.key();
        pool.mint_b = ctx.accounts.mint_b.key();
        pool.vault_a = ctx.accounts.vault_a.key();
        pool.vault_b = ctx.accounts.vault_b.key();
        pool.rate_num = rate_num;
        pool.rate_den = rate_den;
        pool.fee_bps = fee_bps;
        pool.bump = ctx.bumps.pool;
        let (pda, _) = Pubkey::find_program_address(&[b"swap_pool"], ctx.program_id);
        require_keys_eq!(ctx.accounts.vault_a.owner, pda, SwapError::BadVault);
        require_keys_eq!(ctx.accounts.vault_b.owner, pda, SwapError::BadVault);
        require_keys_eq!(ctx.accounts.vault_a.mint, ctx.accounts.mint_a.key(), SwapError::WrongMints);
        require_keys_eq!(ctx.accounts.vault_b.mint, ctx.accounts.mint_b.key(), SwapError::WrongMints);
        Ok(())
    }

    pub fn swap(ctx: Context<Swap>, amount_in: u64, min_out: u64) -> Result<u64> {
        require!(amount_in > 0, SwapError::InvalidAmount);
        let pool = &ctx.accounts.pool;
        let src_mint = ctx.accounts.user_source.mint;
        let dst_mint = ctx.accounts.user_dest.mint;
        let a_to_b = src_mint == pool.mint_a && dst_mint == pool.mint_b;
        let b_to_a = src_mint == pool.mint_b && dst_mint == pool.mint_a;
        require!(a_to_b || b_to_a, SwapError::WrongMints);

        let fee = amount_in
            .checked_mul(pool.fee_bps as u64)
            .ok_or(SwapError::Math)?
            / 10_000;
        let net = amount_in.checked_sub(fee).ok_or(SwapError::Math)?;
        let amount_out = if a_to_b {
            net.checked_mul(pool.rate_num).ok_or(SwapError::Math)? / pool.rate_den
        } else {
            net.checked_mul(pool.rate_den).ok_or(SwapError::Math)? / pool.rate_num
        };
        require!(amount_out >= min_out, SwapError::Slippage);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_source.to_account_info(),
                    to: ctx.accounts.pool_source.to_account_info(),
                    authority: ctx.accounts.user_authority.to_account_info(),
                },
            ),
            amount_in,
        )?;

        let bump = pool.bump;
        let seeds: &[&[u8]] = &[b"swap_pool", &[bump]];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.pool_dest.to_account_info(),
                    to: ctx.accounts.user_dest.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                &[seeds],
            ),
            amount_out,
        )?;
        Ok(amount_out)
    }
}

#[account]
pub struct Pool {
    pub authority: Pubkey,
    pub mint_a: Pubkey,
    pub mint_b: Pubkey,
    pub vault_a: Pubkey,
    pub vault_b: Pubkey,
    pub rate_num: u64,
    pub rate_den: u64,
    pub fee_bps: u16,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub mint_a: Account<'info, Mint>,
    pub mint_b: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        space = 8 + 32 * 5 + 8 * 2 + 2 + 1,
        seeds = [b"swap_pool"],
        bump
    )]
    pub pool: Account<'info, Pool>,
    #[account(mut)]
    pub vault_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_b: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(seeds = [b"swap_pool"], bump = pool.bump)]
    pub pool: Account<'info, Pool>,
    pub user_authority: Signer<'info>,
    #[account(mut)]
    pub user_source: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_dest: Account<'info, TokenAccount>,
    #[account(mut)]
    pub pool_source: Account<'info, TokenAccount>,
    #[account(mut)]
    pub pool_dest: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[error_code]
pub enum SwapError {
    InvalidRate,
    InvalidFee,
    InvalidAmount,
    WrongMints,
    BadVault,
    Math,
    Slippage,
}
