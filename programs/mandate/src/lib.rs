use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use demo_swap::program::DemoSwap;
use demo_swap::Pool as SwapPool;
use demo_yield::program::DemoYield;
use demo_yield::Pool as YieldPool;

declare_id!("5o8EAwdHyQ31Nmt6tUDm1y6PNDt5STmVvA6CX3E6WJPm");

pub const STATE_ACTIVE: u8 = 0;
pub const STATE_PAUSED: u8 = 1;
pub const STATE_REVOKED: u8 = 2;

pub const KIND_SWAP: u8 = 0;
pub const KIND_DEPOSIT: u8 = 1;
pub const KIND_WITHDRAW_VENUE: u8 = 2;
pub const KIND_SPEND: u8 = 3;

/// x402 spend is in-program. Allowlist this program id to permit spend.
pub fn x402_program_id() -> Pubkey {
    ID
}

#[program]
pub mod mandate {
    use super::*;

    pub fn register_operator(
        ctx: Context<RegisterOperator>,
        name: String,
        uri: String,
        fee_bps: u16,
        kind: u8,
    ) -> Result<()> {
        require!(fee_bps <= 10_000, MandateError::InvalidPolicy);
        let profile = &mut ctx.accounts.profile;
        profile.authority = ctx.accounts.authority.key();
        profile.name = to_bytes32(&name);
        profile.uri = to_bytes64(&uri);
        profile.fee_bps = fee_bps;
        profile.kind = kind;
        profile.bump = ctx.bumps.profile;
        Ok(())
    }

    pub fn create_mandate(
        ctx: Context<CreateMandate>,
        seed: u64,
        emergency: Pubkey,
        expires_ts: i64,
        policy: Policy,
    ) -> Result<()> {
        check_policy(&policy)?;
        let now = Clock::get()?.unix_timestamp;
        require!(expires_ts > now, MandateError::InvalidPolicy);
        let m = &mut ctx.accounts.mandate;
        m.owner = ctx.accounts.owner.key();
        m.operator = ctx.accounts.operator.key();
        m.emergency = emergency;
        m.quote_mint = ctx.accounts.quote_mint.key();
        m.state = STATE_ACTIVE;
        m.created_ts = now;
        m.expires_ts = expires_ts;
        m.day_stamp = utc_day(now);
        m.spent_today = 0;
        m.spend_today = 0;
        m.nonce = 0;
        m.yield_shares = 0;
        m.seed = seed;
        m.bump = ctx.bumps.mandate;
        m.policy = policy;
        emit!(MandateCreated {
            mandate: m.key(),
            owner: m.owner,
            operator: m.operator,
            seed,
        });
        Ok(())
    }

    pub fn fund(ctx: Context<Fund>, amount: u64) -> Result<()> {
        require!(amount > 0, MandateError::InvalidAmount);
        let m = &ctx.accounts.mandate;
        require_keys_eq!(ctx.accounts.owner.key(), m.owner, MandateError::UnauthorizedOwner);
        require!(
            token_allowed(&m.policy, &ctx.accounts.mint.key()),
            MandateError::TokenNotAllowlisted
        );
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.source.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            amount,
        )?;
        emit!(MandateFunded {
            mandate: ctx.accounts.mandate.key(),
            token: ctx.accounts.mint.key(),
            amount,
        });
        Ok(())
    }

    pub fn amend_policy(ctx: Context<OwnerOnly>, policy: Policy) -> Result<()> {
        check_policy(&policy)?;
        let m = &mut ctx.accounts.mandate;
        require!(m.state != STATE_REVOKED, MandateError::AlreadyRevoked);
        m.policy = policy;
        emit!(PolicyAmended {
            mandate: m.key(),
        });
        Ok(())
    }

    pub fn pause(ctx: Context<EmergencyOrOwner>) -> Result<()> {
        check_emergency_or_owner(&ctx.accounts.mandate, ctx.accounts.caller.key())?;
        let m = &mut ctx.accounts.mandate;
        require!(m.state == STATE_ACTIVE, MandateError::NotActive);
        m.state = STATE_PAUSED;
        emit!(Paused {
            mandate: m.key(),
            by: ctx.accounts.caller.key(),
        });
        Ok(())
    }

    pub fn unpause(ctx: Context<OwnerOnly>) -> Result<()> {
        let m = &mut ctx.accounts.mandate;
        require!(m.state == STATE_PAUSED, MandateError::NotPaused);
        m.state = STATE_ACTIVE;
        emit!(Unpaused {
            mandate: m.key(),
            by: ctx.accounts.owner.key(),
        });
        Ok(())
    }

    pub fn revoke(ctx: Context<EmergencyOrOwner>) -> Result<()> {
        check_emergency_or_owner(&ctx.accounts.mandate, ctx.accounts.caller.key())?;
        let m = &mut ctx.accounts.mandate;
        require!(m.state != STATE_REVOKED, MandateError::AlreadyRevoked);
        m.state = STATE_REVOKED;
        emit!(Revoked {
            mandate: m.key(),
            by: ctx.accounts.caller.key(),
        });
        Ok(())
    }

    pub fn owner_withdraw(ctx: Context<OwnerWithdraw>, amount: u64) -> Result<()> {
        require!(amount > 0, MandateError::InvalidAmount);
        let bump = ctx.accounts.mandate.bump;
        let owner = ctx.accounts.mandate.owner;
        let seed = ctx.accounts.mandate.seed;
        let seed_bytes = seed.to_le_bytes();
        let seeds: &[&[u8]] = &[b"mandate", owner.as_ref(), seed_bytes.as_ref(), &[bump]];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.destination.to_account_info(),
                    authority: ctx.accounts.mandate.to_account_info(),
                },
                &[seeds],
            ),
            amount,
        )?;
        emit!(OwnerWithdrew {
            mandate: ctx.accounts.mandate.key(),
            token: ctx.accounts.mint.key(),
            amount,
        });
        Ok(())
    }

    pub fn execute_swap(ctx: Context<ExecuteSwap>, amount_in: u64, min_out: u64) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        rollover(&mut ctx.accounts.mandate, now);
        ctx.accounts.mandate.nonce = ctx.accounts.mandate.nonce.saturating_add(1);
        let nonce = ctx.accounts.mandate.nonce;
        let caller = ctx.accounts.caller.key();
        let mint_in = ctx.accounts.mint_in.key();
        let mint_out = ctx.accounts.mint_out.key();
        let venue = ctx.accounts.swap_program.key();
        let pool = load_swap_pool(&ctx.accounts.pool)?;
        let expected = quote_swap(&pool, mint_in, amount_in)?;

        if let Some(reason) = gate_swap(
            &ctx.accounts.mandate,
            caller,
            now,
            venue,
            mint_in,
            mint_out,
            amount_in,
            expected,
            min_out,
        ) {
            return refuse(
                ctx.accounts.mandate.key(),
                caller,
                KIND_SWAP,
                amount_in,
                reason,
                nonce,
            );
        }

        let bump = ctx.accounts.mandate.bump;
        let owner = ctx.accounts.mandate.owner;
        let seed = ctx.accounts.mandate.seed;
        let seed_bytes = seed.to_le_bytes();
        let seeds: &[&[u8]] = &[b"mandate", owner.as_ref(), seed_bytes.as_ref(), &[bump]];

        demo_swap::cpi::swap(
            CpiContext::new_with_signer(
                ctx.accounts.swap_program.to_account_info(),
                demo_swap::cpi::accounts::Swap {
                    pool: ctx.accounts.pool.to_account_info(),
                    user_authority: ctx.accounts.mandate.to_account_info(),
                    user_source: ctx.accounts.vault_in.to_account_info(),
                    user_dest: ctx.accounts.vault_out.to_account_info(),
                    pool_source: ctx.accounts.pool_source.to_account_info(),
                    pool_dest: ctx.accounts.pool_dest.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                },
                &[seeds],
            ),
            amount_in,
            min_out,
        )?;

        let notional = notional_swap(&ctx.accounts.mandate, mint_in, amount_in, expected);
        ctx.accounts.mandate.spent_today = ctx
            .accounts
            .mandate
            .spent_today
            .checked_add(notional)
            .ok_or(MandateError::Math)?;
        emit!(ActionExecuted {
            mandate: ctx.accounts.mandate.key(),
            operator: caller,
            kind: KIND_SWAP,
            venue,
            token_in: mint_in,
            token_out: mint_out,
            amount_in,
            amount_out: expected,
            nonce,
        });
        Ok(())
    }

    pub fn execute_deposit(ctx: Context<ExecuteDeposit>, amount: u64) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        rollover(&mut ctx.accounts.mandate, now);
        ctx.accounts.mandate.nonce = ctx.accounts.mandate.nonce.saturating_add(1);
        let nonce = ctx.accounts.mandate.nonce;
        let caller = ctx.accounts.caller.key();
        let mint = ctx.accounts.mint.key();
        let venue = ctx.accounts.yield_program.key();

        if let Some(reason) = gate_move(
            &ctx.accounts.mandate,
            caller,
            now,
            venue,
            mint,
            amount,
            false,
        ) {
            return refuse(
                ctx.accounts.mandate.key(),
                caller,
                KIND_DEPOSIT,
                amount,
                reason,
                nonce,
            );
        }

        let bump = ctx.accounts.mandate.bump;
        let owner = ctx.accounts.mandate.owner;
        let seed = ctx.accounts.mandate.seed;
        let seed_bytes = seed.to_le_bytes();
        let seeds: &[&[u8]] = &[b"mandate", owner.as_ref(), seed_bytes.as_ref(), &[bump]];

        demo_yield::cpi::deposit(
            CpiContext::new_with_signer(
                ctx.accounts.yield_program.to_account_info(),
                demo_yield::cpi::accounts::Move {
                    pool: ctx.accounts.pool.to_account_info(),
                    user_authority: ctx.accounts.mandate.to_account_info(),
                    user_token: ctx.accounts.vault.to_account_info(),
                    vault: ctx.accounts.pool_vault.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                },
                &[seeds],
            ),
            amount,
        )?;

        let pool = load_yield_pool(&ctx.accounts.pool)?;
        let shares = amount
            .checked_mul(1_000_000)
            .ok_or(MandateError::Math)?
            / pool.share_value.max(1);
        ctx.accounts.mandate.yield_shares = ctx
            .accounts
            .mandate
            .yield_shares
            .checked_add(shares)
            .ok_or(MandateError::Math)?;
        ctx.accounts.mandate.spent_today = ctx
            .accounts
            .mandate
            .spent_today
            .checked_add(amount)
            .ok_or(MandateError::Math)?;
        emit!(ActionExecuted {
            mandate: ctx.accounts.mandate.key(),
            operator: caller,
            kind: KIND_DEPOSIT,
            venue,
            token_in: mint,
            token_out: mint,
            amount_in: amount,
            amount_out: shares,
            nonce,
        });
        Ok(())
    }

    pub fn execute_withdraw_venue(ctx: Context<ExecuteDeposit>, shares: u64) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        rollover(&mut ctx.accounts.mandate, now);
        ctx.accounts.mandate.nonce = ctx.accounts.mandate.nonce.saturating_add(1);
        let nonce = ctx.accounts.mandate.nonce;
        let caller = ctx.accounts.caller.key();
        let mint = ctx.accounts.mint.key();
        let venue = ctx.accounts.yield_program.key();
        let pool = load_yield_pool(&ctx.accounts.pool)?;
        let amount = shares
            .checked_mul(pool.share_value)
            .ok_or(MandateError::Math)?
            / 1_000_000;

        if let Some(reason) = gate_move(
            &ctx.accounts.mandate,
            caller,
            now,
            venue,
            mint,
            amount,
            false,
        ) {
            return refuse(
                ctx.accounts.mandate.key(),
                caller,
                KIND_WITHDRAW_VENUE,
                shares,
                reason,
                nonce,
            );
        }
        require!(
            shares <= ctx.accounts.mandate.yield_shares,
            MandateError::InsufficientShares
        );

        let bump = ctx.accounts.mandate.bump;
        let owner = ctx.accounts.mandate.owner;
        let seed = ctx.accounts.mandate.seed;
        let seed_bytes = seed.to_le_bytes();
        let seeds: &[&[u8]] = &[b"mandate", owner.as_ref(), seed_bytes.as_ref(), &[bump]];

        demo_yield::cpi::withdraw(
            CpiContext::new_with_signer(
                ctx.accounts.yield_program.to_account_info(),
                demo_yield::cpi::accounts::Move {
                    pool: ctx.accounts.pool.to_account_info(),
                    user_authority: ctx.accounts.mandate.to_account_info(),
                    user_token: ctx.accounts.vault.to_account_info(),
                    vault: ctx.accounts.pool_vault.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                },
                &[seeds],
            ),
            shares,
        )?;

        ctx.accounts.mandate.yield_shares = ctx
            .accounts
            .mandate
            .yield_shares
            .checked_sub(shares)
            .ok_or(MandateError::Math)?;
        ctx.accounts.mandate.spent_today = ctx
            .accounts
            .mandate
            .spent_today
            .checked_add(amount)
            .ok_or(MandateError::Math)?;
        emit!(ActionExecuted {
            mandate: ctx.accounts.mandate.key(),
            operator: caller,
            kind: KIND_WITHDRAW_VENUE,
            venue,
            token_in: mint,
            token_out: mint,
            amount_in: shares,
            amount_out: amount,
            nonce,
        });
        Ok(())
    }

    pub fn spend(ctx: Context<Spend>, amount: u64, memo: String) -> Result<()> {
        require!(memo.len() <= 64, MandateError::MemoTooLong);
        let now = Clock::get()?.unix_timestamp;
        rollover(&mut ctx.accounts.mandate, now);
        ctx.accounts.mandate.nonce = ctx.accounts.mandate.nonce.saturating_add(1);
        let nonce = ctx.accounts.mandate.nonce;
        let caller = ctx.accounts.caller.key();
        let mint = ctx.accounts.mint.key();

        if let Some(reason) = gate_move(
            &ctx.accounts.mandate,
            caller,
            now,
            x402_program_id(),
            mint,
            amount,
            true,
        ) {
            return refuse(
                ctx.accounts.mandate.key(),
                caller,
                KIND_SPEND,
                amount,
                reason,
                nonce,
            );
        }
        require_keys_eq!(mint, ctx.accounts.mandate.quote_mint, MandateError::WrongMint);

        let bump = ctx.accounts.mandate.bump;
        let owner = ctx.accounts.mandate.owner;
        let seed = ctx.accounts.mandate.seed;
        let seed_bytes = seed.to_le_bytes();
        let seeds: &[&[u8]] = &[b"mandate", owner.as_ref(), seed_bytes.as_ref(), &[bump]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.destination.to_account_info(),
                    authority: ctx.accounts.mandate.to_account_info(),
                },
                &[seeds],
            ),
            amount,
        )?;
        ctx.accounts.mandate.spend_today = ctx
            .accounts
            .mandate
            .spend_today
            .checked_add(amount)
            .ok_or(MandateError::Math)?;
        msg!("x402 memo={} nonce={}", memo, nonce);
        emit!(ActionExecuted {
            mandate: ctx.accounts.mandate.key(),
            operator: caller,
            kind: KIND_SPEND,
            venue: x402_program_id(),
            token_in: mint,
            token_out: mint,
            amount_in: amount,
            amount_out: amount,
            nonce,
        });
        Ok(())
    }
}

fn refuse(
    mandate: Pubkey,
    operator: Pubkey,
    kind: u8,
    requested_amount: u64,
    reason: BlockReason,
    nonce: u64,
) -> Result<()> {
    msg!("ActionRefused {:?}", reason);
    emit!(ActionRefused {
        mandate,
        operator,
        kind,
        requested_amount,
        reason,
        nonce,
    });
    Ok(())
}

fn check_emergency_or_owner(m: &Account<Mandate>, caller: Pubkey) -> Result<()> {
    if caller == m.owner {
        return Ok(());
    }
    if m.emergency != Pubkey::default() && caller == m.emergency {
        return Ok(());
    }
    err!(MandateError::UnauthorizedOwner)
}

fn check_policy(p: &Policy) -> Result<()> {
    require!(
        p.program_len >= 1 && p.program_len <= 4,
        MandateError::InvalidPolicy
    );
    require!(
        p.token_len >= 1 && p.token_len <= 4,
        MandateError::InvalidPolicy
    );
    Ok(())
}

fn utc_day(ts: i64) -> u64 {
    (ts.max(0) as u64) / 86_400
}

fn rollover(m: &mut Account<Mandate>, now: i64) {
    let stamp = utc_day(now);
    if stamp != m.day_stamp {
        m.day_stamp = stamp;
        m.spent_today = 0;
        m.spend_today = 0;
    }
}

fn program_allowed(p: &Policy, id: &Pubkey) -> bool {
    let n = (p.program_len as usize).min(4);
    p.programs[..n].iter().any(|x| x == id)
}

fn token_allowed(p: &Policy, id: &Pubkey) -> bool {
    let n = (p.token_len as usize).min(4);
    p.tokens[..n].iter().any(|x| x == id)
}

fn load_swap_pool(info: &AccountInfo) -> Result<SwapPool> {
    require_keys_eq!(*info.owner, demo_swap::ID, MandateError::InvalidVenue);
    let data = info.try_borrow_data()?;
    SwapPool::try_deserialize(&mut &data[..]).map_err(|_| error!(MandateError::InvalidVenue))
}

fn load_yield_pool(info: &AccountInfo) -> Result<YieldPool> {
    require_keys_eq!(*info.owner, demo_yield::ID, MandateError::InvalidVenue);
    let data = info.try_borrow_data()?;
    YieldPool::try_deserialize(&mut &data[..]).map_err(|_| error!(MandateError::InvalidVenue))
}

fn quote_swap(pool: &SwapPool, mint_in: Pubkey, amount_in: u64) -> Result<u64> {
    let fee = amount_in
        .checked_mul(pool.fee_bps as u64)
        .ok_or(MandateError::Math)?
        / 10_000;
    let net = amount_in.checked_sub(fee).ok_or(MandateError::Math)?;
    if mint_in == pool.mint_a {
        Ok(net
            .checked_mul(pool.rate_num)
            .ok_or(MandateError::Math)?
            / pool.rate_den.max(1))
    } else if mint_in == pool.mint_b {
        Ok(net
            .checked_mul(pool.rate_den)
            .ok_or(MandateError::Math)?
            / pool.rate_num.max(1))
    } else {
        err!(MandateError::WrongMint)
    }
}

fn notional_swap(m: &Account<Mandate>, mint_in: Pubkey, amount_in: u64, expected: u64) -> u64 {
    if mint_in == m.quote_mint {
        amount_in
    } else {
        expected
    }
}

fn gate_state(m: &Account<Mandate>, caller: Pubkey, now: i64) -> Option<BlockReason> {
    if m.state == STATE_PAUSED {
        return Some(BlockReason::Paused);
    }
    if m.state == STATE_REVOKED {
        return Some(BlockReason::Revoked);
    }
    if now >= m.expires_ts {
        return Some(BlockReason::Expired);
    }
    if caller != m.operator {
        return Some(BlockReason::Unauthorized);
    }
    None
}

fn gate_swap(
    m: &Account<Mandate>,
    caller: Pubkey,
    now: i64,
    venue: Pubkey,
    mint_in: Pubkey,
    mint_out: Pubkey,
    amount_in: u64,
    expected: u64,
    min_out: u64,
) -> Option<BlockReason> {
    if let Some(r) = gate_state(m, caller, now) {
        return Some(r);
    }
    if !program_allowed(&m.policy, &venue) {
        return Some(BlockReason::ProgramNotAllowed);
    }
    if !token_allowed(&m.policy, &mint_in) || !token_allowed(&m.policy, &mint_out) {
        return Some(BlockReason::TokenNotAllowed);
    }
    let notional = notional_swap(m, mint_in, amount_in, expected);
    if notional > m.policy.per_tx_cap {
        return Some(BlockReason::OverTxCap);
    }
    if m.spent_today.saturating_add(notional) > m.policy.daily_cap {
        return Some(BlockReason::OverDailyCap);
    }
    if min_out > expected {
        return Some(BlockReason::SlippageExceeded);
    }
    let floor =
        expected.saturating_sub(expected.saturating_mul(m.policy.max_slippage_bps as u64) / 10_000);
    if min_out < floor {
        return Some(BlockReason::SlippageExceeded);
    }
    None
}

fn gate_move(
    m: &Account<Mandate>,
    caller: Pubkey,
    now: i64,
    venue: Pubkey,
    mint: Pubkey,
    amount: u64,
    is_spend: bool,
) -> Option<BlockReason> {
    if let Some(r) = gate_state(m, caller, now) {
        return Some(r);
    }
    if !program_allowed(&m.policy, &venue) {
        return Some(BlockReason::ProgramNotAllowed);
    }
    if !token_allowed(&m.policy, &mint) {
        return Some(BlockReason::TokenNotAllowed);
    }
    if is_spend {
        if amount > m.policy.spend_per_call_cap {
            return Some(BlockReason::OverSpendCap);
        }
        if m.spend_today.saturating_add(amount) > m.policy.spend_daily_cap {
            return Some(BlockReason::OverSpendDailyCap);
        }
        return None;
    }
    if amount > m.policy.per_tx_cap {
        return Some(BlockReason::OverTxCap);
    }
    if m.spent_today.saturating_add(amount) > m.policy.daily_cap {
        return Some(BlockReason::OverDailyCap);
    }
    None
}

fn to_bytes32(s: &str) -> [u8; 32] {
    let mut out = [0u8; 32];
    let b = s.as_bytes();
    let n = b.len().min(32);
    out[..n].copy_from_slice(&b[..n]);
    out
}

fn to_bytes64(s: &str) -> [u8; 64] {
    let mut out = [0u8; 64];
    let b = s.as_bytes();
    let n = b.len().min(64);
    out[..n].copy_from_slice(&b[..n]);
    out
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum BlockReason {
    OverTxCap,
    OverDailyCap,
    OverSpendCap,
    OverSpendDailyCap,
    ProgramNotAllowed,
    TokenNotAllowed,
    SlippageExceeded,
    Expired,
    Paused,
    Revoked,
    Unauthorized,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default)]
pub struct Policy {
    pub programs: [Pubkey; 4],
    pub program_len: u8,
    pub tokens: [Pubkey; 4],
    pub token_len: u8,
    pub per_tx_cap: u64,
    pub daily_cap: u64,
    pub spend_per_call_cap: u64,
    pub spend_daily_cap: u64,
    pub max_slippage_bps: u16,
}

#[account]
pub struct OperatorProfile {
    pub authority: Pubkey,
    pub name: [u8; 32],
    pub uri: [u8; 64],
    pub fee_bps: u16,
    pub kind: u8,
    pub bump: u8,
}

impl OperatorProfile {
    pub const SPACE: usize = 8 + 32 + 32 + 64 + 2 + 1 + 1;
}

#[account]
pub struct Mandate {
    pub owner: Pubkey,
    pub operator: Pubkey,
    pub emergency: Pubkey,
    pub quote_mint: Pubkey,
    pub state: u8,
    pub created_ts: i64,
    pub expires_ts: i64,
    pub day_stamp: u64,
    pub spent_today: u64,
    pub spend_today: u64,
    pub nonce: u64,
    pub yield_shares: u64,
    pub seed: u64,
    pub bump: u8,
    pub policy: Policy,
}

impl Mandate {
    pub const SPACE: usize = 8 + 640;
}

#[event]
pub struct MandateCreated {
    pub mandate: Pubkey,
    pub owner: Pubkey,
    pub operator: Pubkey,
    pub seed: u64,
}

#[event]
pub struct MandateFunded {
    pub mandate: Pubkey,
    pub token: Pubkey,
    pub amount: u64,
}

#[event]
pub struct PolicyAmended {
    pub mandate: Pubkey,
}

#[event]
pub struct Paused {
    pub mandate: Pubkey,
    pub by: Pubkey,
}

#[event]
pub struct Unpaused {
    pub mandate: Pubkey,
    pub by: Pubkey,
}

#[event]
pub struct Revoked {
    pub mandate: Pubkey,
    pub by: Pubkey,
}

#[event]
pub struct OwnerWithdrew {
    pub mandate: Pubkey,
    pub token: Pubkey,
    pub amount: u64,
}

#[event]
pub struct ActionExecuted {
    pub mandate: Pubkey,
    pub operator: Pubkey,
    pub kind: u8,
    pub venue: Pubkey,
    pub token_in: Pubkey,
    pub token_out: Pubkey,
    pub amount_in: u64,
    pub amount_out: u64,
    pub nonce: u64,
}

#[event]
pub struct ActionRefused {
    pub mandate: Pubkey,
    pub operator: Pubkey,
    pub kind: u8,
    pub requested_amount: u64,
    pub reason: BlockReason,
    pub nonce: u64,
}

#[derive(Accounts)]
pub struct RegisterOperator<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = OperatorProfile::SPACE,
        seeds = [b"operator", authority.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, OperatorProfile>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct CreateMandate<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    /// CHECK: stored as operator; does not need to sign creation.
    pub operator: UncheckedAccount<'info>,
    pub quote_mint: Account<'info, Mint>,
    pub other_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = owner,
        space = Mandate::SPACE,
        seeds = [b"mandate", owner.key().as_ref(), &seed.to_le_bytes()],
        bump
    )]
    pub mandate: Account<'info, Mandate>,
    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = quote_mint,
        associated_token::authority = mandate
    )]
    pub vault_quote: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = other_mint,
        associated_token::authority = mandate
    )]
    pub vault_other: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Fund<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [b"mandate", mandate.owner.as_ref(), &mandate.seed.to_le_bytes()],
        bump = mandate.bump
    )]
    pub mandate: Account<'info, Mandate>,
    pub mint: Account<'info, Mint>,
    #[account(mut, token::mint = mint, token::authority = owner)]
    pub source: Account<'info, TokenAccount>,
    #[account(mut, token::mint = mint, token::authority = mandate)]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct OwnerOnly<'info> {
    pub owner: Signer<'info>,
    #[account(
        mut,
        has_one = owner,
        seeds = [b"mandate", mandate.owner.as_ref(), &mandate.seed.to_le_bytes()],
        bump = mandate.bump
    )]
    pub mandate: Account<'info, Mandate>,
}

#[derive(Accounts)]
pub struct EmergencyOrOwner<'info> {
    pub caller: Signer<'info>,
    #[account(
        mut,
        seeds = [b"mandate", mandate.owner.as_ref(), &mandate.seed.to_le_bytes()],
        bump = mandate.bump
    )]
    pub mandate: Account<'info, Mandate>,
}

#[derive(Accounts)]
pub struct OwnerWithdraw<'info> {
    pub owner: Signer<'info>,
    #[account(
        mut,
        has_one = owner,
        seeds = [b"mandate", mandate.owner.as_ref(), &mandate.seed.to_le_bytes()],
        bump = mandate.bump
    )]
    pub mandate: Account<'info, Mandate>,
    pub mint: Account<'info, Mint>,
    #[account(mut, token::mint = mint, token::authority = mandate)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, token::mint = mint)]
    pub destination: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ExecuteSwap<'info> {
    pub caller: Signer<'info>,
    #[account(
        mut,
        seeds = [b"mandate", mandate.owner.as_ref(), &mandate.seed.to_le_bytes()],
        bump = mandate.bump
    )]
    pub mandate: Account<'info, Mandate>,
    pub mint_in: Account<'info, Mint>,
    pub mint_out: Account<'info, Mint>,
    #[account(mut, token::mint = mint_in, token::authority = mandate)]
    pub vault_in: Account<'info, TokenAccount>,
    #[account(mut, token::mint = mint_out, token::authority = mandate)]
    pub vault_out: Account<'info, TokenAccount>,
    pub swap_program: Program<'info, DemoSwap>,
    /// CHECK: demo_swap pool; owner and layout verified in handler.
    #[account(mut)]
    pub pool: UncheckedAccount<'info>,
    #[account(mut)]
    pub pool_source: Account<'info, TokenAccount>,
    #[account(mut)]
    pub pool_dest: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ExecuteDeposit<'info> {
    pub caller: Signer<'info>,
    #[account(
        mut,
        seeds = [b"mandate", mandate.owner.as_ref(), &mandate.seed.to_le_bytes()],
        bump = mandate.bump
    )]
    pub mandate: Account<'info, Mandate>,
    pub mint: Account<'info, Mint>,
    #[account(mut, token::mint = mint, token::authority = mandate)]
    pub vault: Account<'info, TokenAccount>,
    pub yield_program: Program<'info, DemoYield>,
    /// CHECK: demo_yield pool; owner and layout verified in handler.
    #[account(mut)]
    pub pool: UncheckedAccount<'info>,
    #[account(mut)]
    pub pool_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Spend<'info> {
    pub caller: Signer<'info>,
    #[account(
        mut,
        seeds = [b"mandate", mandate.owner.as_ref(), &mandate.seed.to_le_bytes()],
        bump = mandate.bump
    )]
    pub mandate: Account<'info, Mandate>,
    pub mint: Account<'info, Mint>,
    #[account(mut, token::mint = mint, token::authority = mandate)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, token::mint = mint)]
    pub destination: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[error_code]
pub enum MandateError {
    InvalidPolicy,
    InvalidAmount,
    AlreadyRevoked,
    NotPaused,
    NotActive,
    UnauthorizedOwner,
    Math,
    WrongMint,
    InsufficientShares,
    MemoTooLong,
    TokenNotAllowlisted,
    InvalidVenue,
}
