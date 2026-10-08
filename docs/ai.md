---
description: Machine-readable versions of these docs for AI assistants and coding agents, covering llms.txt, llms-full.txt and Markdown for every page.
---

# llms.txt & Markdown

These docs are published in formats that AI assistants and coding agents can read directly. They follow the [llms.txt](https://llmstxt.org) convention.

| URL | Contents |
| --- | --- |
| [`/llms.txt`](/llms.txt){target="_self"} | An index of every page, with a one-line description of each |
| [`/llms-full.txt`](/llms-full.txt){target="_self"} | The entire documentation in a single Markdown file |
| Any page + `.md` | That page as Markdown, e.g. [`/guide/layers.md`](/guide/layers.md){target="_self"} |

Every example is plain TypeScript inside the Markdown, so the code an agent reads is exactly the code that renders on this site.

## Using them

- **Chat assistants**: paste the `llms-full.txt` URL, or its contents, into the conversation before asking for help with tixi.
- **Coding agents**: point the agent at `llms.txt`. It lists every page, and the agent can fetch only the `.md` pages it needs.
- **Per page**: each page has a **Copy page** button under its title, with options to view the Markdown or open the page in ChatGPT or Claude.

## For agents working on a project

A few rules prevent most mistakes:

1. In Remotion, import `Text` from `tixi/remotion`.
2. `<Text>` takes the caption style as `textStyle`. `style` is the wrapper's CSS.
3. Render Remotion with `--gl=angle` (`Config.setChromiumOpenGlRenderer("angle")`).
4. Load the font stylesheet before any caption is drawn. See [Fonts](/guide/fonts).
5. `layers` go bottom → top, with outlines getting narrower toward the top.
6. Animate with `glyphTransform`, and create filters and images once.
