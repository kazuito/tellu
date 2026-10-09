import { fileURLToPath } from "node:url";
import { defineConfig, type MarkdownRenderer } from "vitepress";
import llmstxt, { copyOrDownloadAsMarkdownButtons } from "vitepress-plugin-llms";
import { demoMarkdown, demoPlugin } from "./demos/plugin";

const root = fileURLToPath(new URL("..", import.meta.url));
const base = process.env.DOCS_BASE ?? "/tellu/";
const origin = process.env.DOCS_ORIGIN ?? "https://kazuito.github.io";
const repository = "https://github.com/kazuito/tellu";

export default defineConfig({
  lang: "en-US",
  title: "tellu",
  description:
    "Broadcast-quality captions for the web: layered outlines, gradients, rich text and Japanese line breaking on PixiJS.",
  base,
  cleanUrls: true,
  lastUpdated: true,
  sitemap: { hostname: `${origin}${base}` },
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: `${base}logo.svg` }],
    ["meta", { name: "theme-color", content: "#ff8a00" }],
    ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
    ["link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: "tellu" }],
  ],
  markdown: {
    config(md) {
      md.use(demoMarkdown);
      // The plugin is typed against its own copy of markdown-it.
      md.use(copyOrDownloadAsMarkdownButtons as unknown as (md: MarkdownRenderer) => void);
    },
  },
  vite: {
    plugins: [
      demoPlugin(root),
      llmstxt({
        domain: origin,
        description: "Telop (caption) rendering for the web on PixiJS, made for Remotion",
        details:
          "tellu draws captions CSS can't: unlimited outline layers, shadows, gradients, rich text, Japanese kinsoku line breaking, vertical writing, " +
          "condensed glyphs with uniform outlines, background plates and per-glyph animation. " +
          "Every page is also available as Markdown by appending `.md` to its URL.",
      }),
    ],
    resolve: { conditions: ["tellu-source"] },
    ssr: { resolve: { conditions: ["tellu-source"] } },
    server: { port: 3400 },
  },
  themeConfig: {
    logo: "/logo.svg",
    nav: [
      { text: "Guide", link: "/guide/introduction", activeMatch: "^/guide/" },
      { text: "Examples", link: "/examples/", activeMatch: "^/examples/" },
      { text: "API", link: "/api/", activeMatch: "^/api/" },
      { text: "llms.txt", link: "/ai", activeMatch: "^/ai" },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Getting started",
          items: [
            { text: "Introduction", link: "/guide/introduction" },
            { text: "Quick start", link: "/guide/quick-start" },
            { text: "Fonts", link: "/guide/fonts" },
          ],
        },
        {
          text: "Styling",
          items: [
            { text: "Layers", link: "/guide/layers" },
            { text: "Paint", link: "/guide/paint" },
            { text: "Typography", link: "/guide/typography" },
            { text: "Rich text", link: "/guide/rich-text" },
            { text: "Background plates", link: "/guide/plates" },
          ],
        },
        {
          text: "Layout",
          items: [
            { text: "Line breaking", link: "/guide/line-breaking" },
            { text: "Fitting text", link: "/guide/fitting" },
            { text: "Vertical writing", link: "/guide/vertical" },
          ],
        },
        {
          text: "Animation",
          items: [{ text: "Glyph transforms", link: "/guide/animation" }],
        },
        {
          text: "Integrations",
          items: [
            { text: "Remotion", link: "/guide/remotion" },
            { text: "React", link: "/guide/react" },
            { text: "Canvas", link: "/guide/canvas" },
            { text: "PixiJS scene", link: "/guide/pixi" },
          ],
        },
        {
          text: "Under the hood",
          items: [
            { text: "How it works", link: "/guide/how-it-works" },
            { text: "Performance", link: "/guide/performance" },
            { text: "Limitations", link: "/guide/limitations" },
          ],
        },
      ],
      "/examples/": [
        {
          text: "Examples",
          items: [
            { text: "Overview", link: "/examples/" },
            { text: "Variety shows", link: "/examples/variety" },
            { text: "News & subtitles", link: "/examples/broadcast" },
            { text: "YouTube & Shorts", link: "/examples/social" },
            { text: "Film & titles", link: "/examples/cinema" },
          ],
        },
      ],
      "/api/": [
        {
          text: "API reference",
          items: [
            { text: "Overview", link: "/api/" },
            { text: "Rendering", link: "/api/rendering" },
            { text: "Style helpers", link: "/api/helpers" },
            { text: "Layout & fonts", link: "/api/layout" },
            { text: "Types", link: "/api/types" },
            { text: "tellu/react", link: "/api/react" },
            { text: "tellu/remotion", link: "/api/remotion" },
          ],
        },
      ],
    },
    outline: { level: [2, 3] },
    socialLinks: [{ icon: "github", link: repository }],
    editLink: { pattern: `${repository}/edit/main/docs/:path`, text: "Edit this page on GitHub" },
    search: { provider: "local" },
    footer: { message: "Released under the MIT License." },
  },
});
