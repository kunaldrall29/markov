import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import { themes as prismThemes } from "prism-react-renderer";
import { tokenCss, tokens } from "./src/lib/tokens";

const HOSTED_RECEIPTS = "https://data-api-production-5ac5.up.railway.app";
const HOSTED_FLOAT = "https://float-web-three.vercel.app";

const receiptsApiUrl =
  process.env.RECEIPTS_API_URL?.trim() ||
  (process.env.VERCEL ? HOSTED_RECEIPTS : "http://127.0.0.1:8788");
const floatUrl =
  process.env.FLOAT_URL?.trim() || (process.env.VERCEL ? HOSTED_FLOAT : "http://127.0.0.1:3000");
const siteUrl =
  process.env.SITE_URL?.trim() ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://127.0.0.1:3001");

const config: Config = {
  title: "Markov",
  tagline: "Give an agent your capital. Keep the keys.",
  url: siteUrl,
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
  customFields: {
    receiptsApiUrl,
    floatUrl,
  },
  stylesheets: [
    {
      href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;1,9..144,500&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500&display=swap",
      type: "text/css",
    },
  ],
  plugins: [
    function floatChrome() {
      return {
        name: "float-chrome",
        injectHtmlTags() {
          return {
            headTags: [
              {
                tagName: "style",
                innerHTML: tokenCss(),
              },
            ],
          };
        },
      };
    },
  ],
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
      defaultMode: "dark",
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    metadata: [{ name: "theme-color", content: tokens.color.base }],
    navbar: {
      title: "Markov",
      items: [
        { type: "docSidebar", sidebarId: "docs", position: "left", label: "Docs" },
        { to: "/receipts", label: "Live receipts", position: "left" },
        { href: floatUrl, label: "Float", position: "right" },
        { href: "https://markovhq.com", label: "markovhq.com", position: "right" },
        {
          type: "html",
          position: "right",
          value: '<span class="cluster-chip">devnet</span>',
        },
      ],
    },
    footer: {
      style: "dark",
      copyright:
        "Protocol docs in this repository. Marketing: markovhq.com. Not a restyle of that site.",
    },
    prism: {
      theme: prismThemes.vsDark,
      darkTheme: prismThemes.vsDark,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
