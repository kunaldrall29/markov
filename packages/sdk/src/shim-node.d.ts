declare module "node:crypto" {
  export function createHash(algorithm: string): {
    update(data: string | Uint8Array): {
      digest(encoding: "hex" | "base64"): string;
    };
  };
}
