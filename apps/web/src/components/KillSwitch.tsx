"use client";

import { copy } from "@/lib/copy";
import { withdrawDisabled } from "@/lib/withdraw";

export { withdrawDisabled };

export function WithdrawButton({
  amount,
  state,
  pending,
  onWithdraw,
  label,
}: {
  amount: number;
  state: string;
  pending?: boolean;
  onWithdraw: () => void;
  label: string;
}) {
  return (
    <button
      className="btn ghost"
      type="button"
      disabled={withdrawDisabled(amount, state) || pending}
      onClick={onWithdraw}
    >
      {pending ? copy.subscribe.pending : label}
    </button>
  );
}

export function KillSwitch({
  armed,
  onArm,
  onRevoke,
  pending,
}: {
  armed: boolean;
  onArm: () => void;
  onRevoke: () => void;
  pending?: boolean;
}) {
  if (!armed) {
    return (
      <button className="btn kill" type="button" onClick={onArm} disabled={pending}>
        {copy.kill.arm}
      </button>
    );
  }
  return (
    <button className="btn kill" type="button" onClick={onRevoke} disabled={pending}>
      {pending ? copy.subscribe.pending : copy.kill.confirm}
    </button>
  );
}
