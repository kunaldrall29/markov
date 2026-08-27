use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("GsE3vpoBb26vZWbPBbtMACwVem2qgw7whouTLwAAhyzC");

#[program]
pub mod demo_yield {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.authority = ctx.accounts.authority.key();
        pool.mint = ctx.accounts.mint.key();
        pool.vault = ctx.accounts.vault.key();
        pool.total_shares = 0;
        pool.share_value = 1_000_000;
        pool.bump = ctx.bumps.pool;
        let (pda, _) = Pubkey::find_program_address(&[b"yield_pool"], ctx.program_id);
        require_keys_eq!(ctx.accounts.vault.owner, pda, YieldError::BadVault);
        require_keys_eq!(ctx.accounts.vault.mint, ctx.accounts.mint.key(), YieldError::BadVault);
        Ok(())
    }

    pub fn set_share_value(ctx: Context<SetShareValue>, share_value: u64) -> Result<()> {
        require!(share_value > 0, YieldError::InvalidAmount);
        require_keys_eq!(ctx.accounts.authority.key(), ctx.accounts.pool.authority, YieldError::Unauthorized);
        ctx.accounts.pool.share_value = share_value;
        Ok(())
    }

    pub fn deposit(ctx: Context<Move>, amount: u64) -> Result<u64> {
        require!(amount > 0, YieldError::InvalidAmount);
        require_keys_eq!(ctx.accounts.vault.key(), ctx.accounts.pool.vault, YieldError::BadVault);
        require_keys_eq!(ctx.accounts.vault.mint, ctx.accounts.pool.mint, YieldError::BadVault);
        let shares = amount
            .checked_mul(1_000_000)
            .ok_or(YieldError::Math)?
            / ctx.accounts.pool.share_value.max(1);
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.user_authority.to_account_info(),
                },
            ),
            amount,
        )?;
        let pool = &mut ctx.accounts.pool;
        pool.total_shares = pool.total_shares.checked_add(shares).ok_or(YieldError::Math)?;
        Ok(shares)
    }

    pub fn withdraw(ctx: Context<Move>, shares: u64) -> Result<u64> {
        require!(shares > 0, YieldError::InvalidAmount);
        require_keys_eq!(ctx.accounts.vault.key(), ctx.accounts.pool.vault, YieldError::BadVault);
        require_keys_eq!(ctx.accounts.vault.mint, ctx.accounts.pool.mint, YieldError::BadVault);
        require!(shares <= ctx.accounts.pool.total_shares, YieldError::Insufficient);
        let amount = shares
            .checked_mul(ctx.accounts.pool.share_value)
            .ok_or(YieldError::Math)?
            / 1_000_000;
        let bump = ctx.accounts.pool.bump;
        let seeds: &[&[u8]] = &[b"yield_pool", &[bump]];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.user_token.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                &[seeds],
            ),
            amount,
        )?;
        let pool = &mut ctx.accounts.pool;
        pool.total_shares = pool.total_shares.checked_sub(shares).ok_or(YieldError::Math)?;
        Ok(amount)
    }
}

#[account]
pub struct Pool {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub total_shares: u64,
    pub share_value: u64,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        space = 8 + 32 * 3 + 8 * 2 + 1,
        seeds = [b"yield_pool"],
        bump
    )]
    pub pool: Account<'info, Pool>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetShareValue<'info> {
    pub authority: Signer<'info>,
    #[account(mut, seeds = [b"yield_pool"], bump = pool.bump)]
    pub pool: Account<'info, Pool>,
}

#[derive(Accounts)]
pub struct Move<'info> {
    #[account(mut, seeds = [b"yield_pool"], bump = pool.bump)]
    pub pool: Account<'info, Pool>,
    pub user_authority: Signer<'info>,
    #[account(mut)]
    pub user_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[error_code]
pub enum YieldError {
    InvalidAmount,
    Insufficient,
    Math,
    BadVault,
    Unauthorized,
}
