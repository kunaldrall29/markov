import { existsSync, readFileSync } from "node:fs";
import { Keypair, PublicKey } from "@solana/web3.js";
import type { DevnetFacts } from "./types";

export function loadKeypair(path: string): Keypair {
  const raw = JSON.parse(readFileSync(path, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

export function mandatePda(programId: PublicKey, owner: PublicKey, seed: bigint): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(seed);
  return PublicKey.findProgramAddressSync([Buffer.from("mandate"), owner.toBuffer(), buf], programId)[0];
}

export function operatorPda(programId: PublicKey, authority: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("operator"), authority.toBuffer()], programId)[0];
}

export function swapPoolPda(swapProgram: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("swap_pool")], swapProgram)[0];
}

export function yieldPoolPda(yieldProgram: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("yield_pool")], yieldProgram)[0];
}

export function loadFacts(path = "data/devnet.json"): DevnetFacts | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as DevnetFacts;
}
