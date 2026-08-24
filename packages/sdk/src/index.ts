import type { Intent, Mandate, OperatorProfile, Policy, Receipt } from "@markov/engine";

export interface CreateMandateBody {
  owner: string;
  operator: string;
  emergencyKey?: string | null;
  policy?: Partial<Policy>;
  ttlSecs?: number;
  fundAmount?: number;
}

export class MarkovClient {
  constructor(
    public baseUrl: string,
    public actor: string,
  ) {}

  private async req<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        "x-actor": this.actor,
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status} ${path}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  health() {
    return this.req<{ ok: boolean; network: string }>(`/health`);
  }

  operators() {
    return this.req<OperatorProfile[]>(`/operators`);
  }

  mandates() {
    return this.req<Mandate[]>(`/mandates`);
  }

  mandate(id: string) {
    return this.req<{ mandate: Mandate; receipts: Receipt[] }>(`/mandates/${id}`);
  }

  receipts(mandateId?: string) {
    const q = mandateId ? `?mandateId=${mandateId}` : "";
    return this.req<Receipt[]>(`/receipts${q}`);
  }

  createMandate(body: CreateMandateBody) {
    return this.req<Mandate>(`/mandates`, { method: "POST", body: JSON.stringify(body) });
  }

  fund(id: string, token: string, amount: number) {
    return this.req<Receipt>(`/mandates/${id}/fund`, {
      method: "POST",
      body: JSON.stringify({ token, amount }),
    });
  }

  execute(id: string, intent: Intent) {
    return this.req<Receipt>(`/mandates/${id}/execute`, {
      method: "POST",
      body: JSON.stringify(intent),
    });
  }

  pause(id: string) {
    return this.req<Receipt>(`/mandates/${id}/pause`, { method: "POST" });
  }

  unpause(id: string) {
    return this.req<Receipt>(`/mandates/${id}/unpause`, { method: "POST" });
  }

  revoke(id: string) {
    return this.req<Receipt>(`/mandates/${id}/revoke`, { method: "POST" });
  }

  withdraw(id: string, token: string, amount: number) {
    return this.req<Receipt>(`/mandates/${id}/withdraw`, {
      method: "POST",
      body: JSON.stringify({ token, amount }),
    });
  }

  price(mandateId: string, symbol = "DEMO") {
    return this.req<{ price: number; paid: Receipt }>(`/data/price`, {
      method: "POST",
      body: JSON.stringify({ mandateId, symbol }),
    });
  }

  tickAgent(agent: "dca" | "dip", mandateId: string, overCap = false) {
    return this.req<{ receipts: Receipt[] }>(`/agents/${agent}/tick`, {
      method: "POST",
      body: JSON.stringify({ mandateId, overCap }),
    });
  }

  fourBeat() {
    return this.req<{
      mandateId: string;
      beats: { name: string; receipts: Receipt[] }[];
    }>(`/demo/four-beat`, { method: "POST" });
  }
}
