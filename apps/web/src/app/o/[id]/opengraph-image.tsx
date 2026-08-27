import { ImageResponse } from "next/og";
import { API_URL, type OperatorRow } from "@/lib/api";
import { copy } from "@/lib/copy";
import { tokens } from "@/lib/tokens";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Float track record";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let name = id;
  let handle = id;
  let actions = 0;
  let refusals = 0;
  let days = 0;
  try {
    const res = await fetch(`${API_URL}/operators/${id}`, { cache: "no-store" });
    if (res.ok) {
      const row = (await res.json()) as OperatorRow;
      name = row.name;
      handle = row.authority;
      actions = row.stats?.actions ?? 0;
      refusals = row.stats?.refusals ?? 0;
      days = Math.max(0, Math.floor((row.stats?.tenureSecs ?? 0) / 86400));
    }
  } catch {
    /* render with id */
  }

  const color = tokens.color;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: color.base,
          color: color.text,
          padding: 72,
          border: `1px solid ${color["authority-dim"]}`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 18,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: color.muted,
            }}
          >
            {copy.product}
          </div>
          <div style={{ fontSize: 44, marginTop: 16 }}>{name}</div>
          <div style={{ fontSize: 22, color: color.muted, marginTop: 8 }}>{handle}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, color: color.refusal, lineHeight: 0.9 }}>
            {refusals} {refusals === 1 ? "refusal" : "refusals"}
          </div>
          <div style={{ fontSize: 24, color: color.muted, marginTop: 24 }}>
            {actions} actions · {days}d tenure
          </div>
          <div style={{ fontSize: 18, color: color.muted, marginTop: 12 }}>{copy.marketplace.chainLabel}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
