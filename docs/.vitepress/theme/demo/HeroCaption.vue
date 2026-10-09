<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import type { DemoView } from "./runtime";

const host = ref<HTMLElement>();
let view: DemoView | undefined;
let unmounted = false;

onMounted(async () => {
  const [{ mountDemo }, { heroCaption, heroLoop }] = await Promise.all([import("./runtime"), import("./hero")]);
  if (unmounted) return;
  view = await mountDemo(host.value!, heroCaption, { loop: heroLoop, still: 40 });
  if (unmounted) return view.destroy();
  view.setPlaying(!matchMedia("(prefers-reduced-motion: reduce)").matches);
});

onBeforeUnmount(() => {
  unmounted = true;
  view?.destroy();
});
</script>

<template>
  <div ref="host" class="tellu-hero-caption" />
</template>
