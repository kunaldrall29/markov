"use client";

import type { ReactNode } from "react";
import { ToastHost } from "@/components/Toast";
import { WalletProviders } from "@/components/WalletProviders";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProviders>
      <ToastHost>{children}</ToastHost>
    </WalletProviders>
  );
}
