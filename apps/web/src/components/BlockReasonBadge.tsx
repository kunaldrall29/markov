import { badgeFamily, isBlockReason, vernacular } from "@/lib/reasons";

export function BlockReasonBadge({ reason }: { reason: unknown }) {
  if (!isBlockReason(reason)) return null;
  const family = badgeFamily(reason);
  return (
    <span className={`badge badge-${family}`}>{vernacular(reason)}</span>
  );
}
