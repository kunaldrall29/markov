"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { useCallback } from "react";
import { copy } from "@/lib/copy";
import { confirmChainIntent } from "@/lib/signPreview";
import { useApi, type ApiCaller } from "@/lib/useApi";

export type ChainAware<T> = T & {
  mode?: string;
  tx?: string;
  intent?: unknown;
  id?: string;
  sig?: string;
  explorerUrl?: string;
};

function bytesFromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function useChainApi(): { api: ApiCaller; mutate: ApiCaller; connected: boolean; publicKey: string | null } {
  const { api, connected, publicKey } = useApi();
  const { signTransaction } = useWallet();
  const { connection } = useConnection();

  const mutate = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      const out = await api<ChainAware<T>>(path, init);
      if (!out || (out as ChainAware<T>).mode !== "chain" || typeof (out as ChainAware<T>).tx !== "string") {
        return out as T;
      }
      if (!signTransaction) throw new Error(copy.wallet.required);
      const built = out as ChainAware<T>;
      const previewOk = await confirmChainIntent(built.intent);
      if (!previewOk) throw new Error("Signature cancelled");
      const tx = Transaction.from(bytesFromB64(built.tx!));
      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
      const latest = await connection.getLatestBlockhash("confirmed");
      await connection.confirmTransaction({ signature: sig, ...latest }, "confirmed");
      return api<T>("/chain/confirm", {
        method: "POST",
        body: JSON.stringify({ sig, intent: built.intent }),
      });
    },
    [api, connection, signTransaction],
  );

  return { api, mutate, connected, publicKey };
}
