import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docs: [
    "index",
    {
      type: "category",
      label: "Concepts",
      items: ["mandates", "policy", "receipts", "kill-switch"],
    },
    {
      type: "category",
      label: "Guides",
      items: ["owners", "operators", "venues"],
    },
    {
      type: "category",
      label: "Reference",
      items: ["program", "sdk", "block-reason", "data-api", "security"],
    },
  ],
};

export default sidebars;
