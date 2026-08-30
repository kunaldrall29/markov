export function describeIntent(intent: unknown): string {
  if (!intent || typeof intent !== "object") return "Unknown Solana transaction.";
  const i = intent as Record<string, unknown>;
  const action = typeof i.action === "string" ? i.action : "unknown";
  const mandate =
    typeof i.mandateId === "string"
      ? i.mandateId
      : typeof i.seed === "string"
        ? `seed ${i.seed}`
        : "this mandate";
  const amount =
    typeof i.amount === "number" ? i.amount : typeof i.fundAmount === "number" ? i.fundAmount : null;
  const lines = [`Action: ${action}`, `Mandate: ${mandate}`];
  if (amount != null) lines.push(`Amount: ${amount}`);
  if (typeof i.operator === "string") lines.push(`Operator: ${i.operator}`);
  if (typeof i.strategyId === "string" && i.strategyId) lines.push(`Strategy: ${i.strategyId.slice(0, 8)}…`);
  return lines.join("\n");
}

export function confirmChainIntent(intent: unknown): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(true);
  const summary = describeIntent(intent);
  return new Promise((resolve) => {
    const root = document.createElement("div");
    root.className = "sign-preview";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "sign-preview-title");
    const card = document.createElement("div");
    card.className = "sign-preview-card";
    const title = document.createElement("h2");
    title.id = "sign-preview-title";
    title.textContent = "Review before signing";
    const pre = document.createElement("pre");
    pre.className = "sign-preview-body";
    pre.textContent = `${summary}\n\nYour wallet will prompt next.`;
    const actions = document.createElement("div");
    actions.className = "actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn ghost";
    cancel.textContent = "Cancel";
    const sign = document.createElement("button");
    sign.type = "button";
    sign.className = "btn";
    sign.textContent = "Sign";
    const done = (ok: boolean) => {
      root.remove();
      resolve(ok);
    };
    cancel.onclick = () => done(false);
    sign.onclick = () => done(true);
    actions.append(cancel, sign);
    card.append(title, pre, actions);
    root.append(card);
    document.body.append(root);
    sign.focus();
  });
}
