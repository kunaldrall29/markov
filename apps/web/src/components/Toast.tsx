"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

const ToastCtx = createContext<(msg: string) => void>(() => undefined);

export function ToastHost({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState("");
  const push = useCallback((next: string) => {
    setMsg(next);
    window.setTimeout(() => setMsg(""), 2800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      {msg ? (
        <div className="toast" role="status">
          {msg}
        </div>
      ) : null}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
