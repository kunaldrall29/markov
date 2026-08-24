import { MandateEngine } from "@markov/engine";
import { runFourBeat } from "../apps/api/src/four-beat";
import { seed } from "../apps/api/src/seed";

const engine = new MandateEngine();
seed(engine);
const result = runFourBeat(engine);

console.log("four-beat demo");
console.log("mandate", result.mandateId);
for (const beat of result.beats) {
  console.log(`\n# ${beat.name}`);
  for (const receipt of beat.receipts) {
    const extra =
      receipt.type === "ActionRefused"
        ? ` reason=${receipt.reason}`
        : receipt.type === "ActionExecuted"
          ? ` ${receipt.kind} ${receipt.amountIn}->${receipt.amountOut}`
          : "";
    console.log(`  ${receipt.type}${extra}`);
  }
}

const refused = result.beats.find((b) => b.name === "over-cap-refused")?.receipts.some((r) => r.type === "ActionRefused");
const revoked = result.beats.find((b) => b.name === "revoke-mid-flight")?.receipts.some((r) => r.type === "Revoked");
const blockedAfter = result.beats
  .find((b) => b.name === "revoke-mid-flight")
  ?.receipts.some((r) => r.type === "ActionRefused" && r.reason === "Revoked");

if (!refused || !revoked || !blockedAfter) {
  console.error("four-beat did not meet success criteria");
  process.exit(1);
}
console.log("\nok — funded, acted, refused over-cap, revoked mid-flight");
