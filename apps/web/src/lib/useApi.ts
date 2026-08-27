"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback } from "react";
import bs58 from "bs58";
import { authorizeMutation, markovCluster, sha256Hex } from "@markov/rpc";
import { API_URL, errorMessage } from "@/lib/api";
import { copy } from "@/lib/copy";

export type ApiCaller = <T>(path: string, init?: RequestInit) => Promise<T>;

export function useApi(): { api: ApiCaller; connected: boolean; publicKey: string | null } {
  const { publicKey, signMessage, connected } = useWallet();
  const pk = publicKey?.toBase58() ?? null;

  const call = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      const method = (init?.method ?? "GET").toUpperCase();
      const headers: Record<string, string> = {
        "content-type": "application/json",
      };
      const extra = init?.headers;
      if (extra && extra instanceof Headers) {
        extra.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (extra && !Array.isArray(extra)) {
        Object.assign(headers, extra);
      }

      const rawBody = typeof init?.body === "string" ? init.body : "";
      if (method !== "GET" && method !== "HEAD") {
        if (pk && signMessage) {
          const ts = String(Math.floor(Date.now() / 1000));
          const bodyHash = await sha256Hex(new TextEncoder().encode(rawBody));
          const msg = authorizeMutation(method, path.split("?")[0] ?? path, bodyHash, pk, ts, markovCluster());
          const sig = await signMessage(new TextEncoder().encode(msg));
          headers["x-actor"] = pk;
          headers["x-owner-ts"] = ts;
          headers["x-owner-sig"] = bs58.encode(sig);
        } else {
          headers["x-actor"] = headers["x-actor"] ?? "owner_demo";
        }
      }

      const res = await fetch(`${API_URL}${path}`, {
        ...init,
        method,
        cache: "no-store",
        headers,
      });
      if (!res.ok) {
        const text = await res.text();
        if (res.status === 401 && !pk) throw new Error(copy.wallet.required);
        throw new Error(errorMessage(text));
      }
      return res.json() as Promise<T>;
    },
    [pk, signMessage],
  );

  return { api: call, connected, publicKey: pk };
}
