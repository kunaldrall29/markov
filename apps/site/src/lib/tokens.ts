import tokens from "../../../web/design-tokens.json";

export { tokens };

export function tokenCss(): string {
  const color = Object.entries(tokens.color)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join("\n");
  const space = Object.entries(tokens.space)
    .map(([k, v]) => `  --space-${k}: ${v};`)
    .join("\n");
  const radius = Object.entries(tokens.radius)
    .map(([k, v]) => `  --radius-${k}: ${v};`)
    .join("\n");
  return `:root {\n${color}\n${space}\n${radius}\n  --serif: var(--font-display), "Times New Roman", serif;\n  --sans: var(--font-body), system-ui, sans-serif;\n  --mono: var(--font-mono), ui-monospace, monospace;\n}`;
}

export function badgeFamily(reason: string | null): keyof typeof tokens.badgeFamily {
  if (!reason) return "state";
  for (const [family, list] of Object.entries(tokens.badgeFamily) as [
    keyof typeof tokens.badgeFamily,
    readonly string[],
  ][]) {
    if (list.includes(reason)) return family;
  }
  return "state";
}
