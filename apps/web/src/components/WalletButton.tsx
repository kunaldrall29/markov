"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import { useEffect, useState } from "react";
import { markovCluster } from "@markov/rpc";
import { shortPubkey } from "@/lib/api";
import { copy } from "@/lib/copy";

const INSTALL: Record<string, string> = {
  Phantom: "https://phantom.app/download",
  Solflare: "https://solflare.com/download",
};

export function WalletButton() {
  const { wallets, select, connect, connected, connecting, publicKey, disconnect, wallet } = useWallet();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<WalletName | null>(null);

  useEffect(() => {
    if (connected) {
      setOpen(false);
      setPending(null);
    }
  }, [connected]);

  useEffect(() => {
    if (!pending || !wallet || wallet.adapter.name !== pending || connected || connecting) return;
    void connect().catch(() => setPending(null));
  }, [pending, wallet, connected, connecting, connect]);

  function pick(name: WalletName) {
    const row = wallets.find((w) => w.adapter.name === name);
    if (!row) return;
    if (row.readyState === WalletReadyState.NotDetected) {
      const href = INSTALL[name];
      if (href) window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    setPending(name);
    select(name);
  }

  return (
    <div className="wallet-wrap">
      {connected && publicKey ? (
        <button type="button" className="btn ghost wallet-btn" onClick={() => void disconnect()} title={copy.wallet.disconnect}>
          {shortPubkey(publicKey.toBase58())}
        </button>
      ) : (
        <button
          type="button"
          className="btn authority wallet-btn"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={connecting}
        >
          {connecting ? copy.wallet.connecting : copy.wallet.connect}
        </button>
      )}
      {open ? (
        <div className="wallet-modal" role="dialog" aria-label={copy.wallet.connect} aria-modal="true">
          <p className="meta">{copy.wallet.pick}</p>
          <p className="cluster-chip">{markovCluster()}</p>
          {wallets.map((w) => {
            const missing = w.readyState === WalletReadyState.NotDetected;
            return (
              <button
                key={w.adapter.name}
                type="button"
                className="btn ghost wallet-choice"
                onClick={() => pick(w.adapter.name)}
              >
                {missing ? `${copy.wallet.install} ${w.adapter.name}` : w.adapter.name}
              </button>
            );
          })}
          <button type="button" className="btn ghost" onClick={() => setOpen(false)}>
            {copy.wallet.close}
          </button>
        </div>
      ) : null}
    </div>
  );
}
