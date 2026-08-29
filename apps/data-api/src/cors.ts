import { isProductOrigin } from "@markov/rpc";

export function isAllowedOrigin(origin: string | undefined | null): boolean {
  return isProductOrigin(origin);
}
