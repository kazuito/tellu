<script setup lang="ts">
import demos from "virtual:tixi-demos";
import { onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import type { DemoView } from "./runtime";

const props = withDefaults(
  defineProps<{ id: string; compare?: boolean; backdrop?: string; loop?: number; still?: number }>(),
  { backdrop: "night" },
);

const stage = ref<HTMLElement>();
const host = ref<HTMLElement>();
const view = shallowRef<DemoView>();
const status = ref<"idle" | "loading" | "ready" | "error">("idle");
const error = ref("");
const playing = ref(false);
let visible = false;
let wantsPlay = true;
let observer: IntersectionObserver | undefined;

function syncPlayback() {
  view.value?.setPlaying(visible && wantsPlay);
  playing.value = view.value?.playing ?? false;
}

async function load() {
  status.value = "loading";
  try {
    const [{ mountDemo }, module] = await Promise.all([import("./runtime"), demos[props.id]!()]);
    view.value = await mountDemo(host.value!, module.default, { loop: props.loop, still: props.still });
    status.value = "ready";
    syncPlayback();
  } catch (cause) {
    status.value = "error";
    error.value = cause instanceof Error ? cause.message : String(cause);
    console.error(cause);
  }
}

function togglePlay() {
  wantsPlay = !playing.value;
  syncPlayback();
}

onMounted(() => {
  wantsPlay = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry!.isIntersecting;
      if (visible && status.value === "idle") void load();
      syncPlayback();
    },
    { rootMargin: "200px 0px" },
  );
  observer.observe(stage.value!);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  view.value?.destroy();
});
</script>

<template>
  <div class="tixi-demo" :class="{ compare }">
    <div ref="stage" class="tixi-demo-stage" :class="`backdrop-${backdrop}`" :data-status="status">
      <div ref="host" class="tixi-demo-canvas" />
      <span v-if="status === 'idle' || status === 'loading'" class="tixi-demo-hint">Rendering…</span>
      <span v-else-if="status === 'error'" class="tixi-demo-error">{{ error }}</span>
      <button
        v-if="view?.animated"
        type="button"
        class="tixi-demo-play"
        :aria-label="playing ? 'Pause animation' : 'Play animation'"
        @click="togglePlay"
      >
        <svg v-if="playing" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3h3v10H4zM9 3h3v10H9z" /></svg>
        <svg v-else viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" /></svg>
      </button>
    </div>
    <slot />
  </div>
</template>
