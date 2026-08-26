import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "Markov",
  tagline: "Give an agent your capital. Keep the keys.",
  url: "http://127.0.0.1:3001",
  baseUrl: "/",
  organizationName: "kunaldrall29",
  projectName: "markov",
  onBrokenLinks: "throw",
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "throw",
    },
  },
  trailingSlash: false,
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          routeBasePath: "docs",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    colorMode: {
      defaultMode: "light",
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: "Markov",
      items: [
        { type: "docSidebar", sidebarId: "docs", position: "left", label: "Docs" },
        { href: "http://127.0.0.1:3000", label: "Float", position: "right" },
        { href: "https://markovhq.com", label: "markovhq.com", position: "right" },
      ],
    },
    footer: {
      style: "light",
      copyright:
        "Protocol docs in this repository. Marketing: markovhq.com. Not a restyle of that site.",
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
