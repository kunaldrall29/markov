import type { Program } from "@coral-xyz/anchor";

/** Anchor 0.31 types optional-chain methods; the IDL is present at runtime. */
export function methods(program: Program): any {
  return program.methods;
}

export function accounts(program: Program): any {
  return program.account;
}
