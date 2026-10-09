import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import CopyOrDownloadAsMarkdownButtons from "vitepress-plugin-llms/vitepress-components/CopyOrDownloadAsMarkdownButtons.vue";
import { defineAsyncComponent } from "vue";
import TelluDemo from "./demo/TelluDemo.vue";
import Layout from "./Layout.vue";
import "./style.css";

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component("TelluDemo", TelluDemo);
    app.component(
      "TelluPlayground",
      defineAsyncComponent(() => import("./playground/TelluPlayground.vue")),
    );
    app.component("CopyOrDownloadAsMarkdownButtons", CopyOrDownloadAsMarkdownButtons);
  },
} satisfies Theme;
