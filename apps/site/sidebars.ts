import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docs: [
    "index",
    {
      type: "category",
      label: "Concepts",
      collapsed: false,
      items: ["mandates", "policy", "receipts", "kill-switch"],
    },
    {
      type: "category",
      label: "Guides",
      collapsed: false,
      items: ["owners", "operators", "venues"],
    },
    {
      type: "category",
      label: "Reference",
      collapsed: false,
      items: ["program", "sdk", "block-reason", "data-api", "security"],
    },
  ],
};

export default sidebars;
