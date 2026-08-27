import type { ReactNode } from "react";

export function PolicyChip({
  children,
  tone = "plain",
}: {
  children: ReactNode;
  tone?: "plain" | "authority" | "refusal";
}) {
  const extra = tone === "authority" ? " authority" : tone === "refusal" ? " refusal" : "";
  return <span className={`policy-chip${extra}`}>{children}</span>;
}
