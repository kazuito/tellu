<script setup lang="ts">
import { useData } from "vitepress";
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from "vue";
import type { DemoView } from "../demo/runtime";
import type { PlaygroundEditor } from "./editor";
import { type PlaygroundMode, type PlaygroundPreset, presets } from "./presets";

const MODES: { value: PlaygroundMode; label: string }[] = [
  { value: "ts", label: "TypeScript" },
  { value: "react", label: "React" },
];
const BACKDROPS = ["checker", "night", "street", "studio", "light"];
const DEBOUNCE_MS = 300;

const { isDark } = useData();

const presetsOf = (mode: PlaygroundMode) => presets.filter((preset) => preset.mode === mode);
const presetById = (id: string) => presets.find((preset) => preset.id === id)!;

const mode = ref<PlaygroundMode>("ts");
const selected = reactive<Record<PlaygroundMode, string>>({
  ts: presetsOf("ts")[0]!.id,
  react: presetsOf("react")[0]!.id,
});
const codes: Record<PlaygroundMode, string> = {
  ts: presetById(selected.ts).code,
  react: presetById(selected.react).code,
};
const preset = computed(() => presetById(selected[mode.value]));
const groups = computed(() => {
  const byGroup = new Map<string, PlaygroundPreset[]>();
  for (const item of presetsOf(mode.value)) byGroup.set(item.group, [...(byGroup.get(item.group) ?? []), item]);
  return [...byGroup];
});
const backdrop = ref(preset.value.backdrop ?? "checker");

const editorElement = ref<HTMLElement>();
const hosts = ref<HTMLElement>();
const editor = shallowRef<PlaygroundEditor>();
const view = shallowRef<DemoView>();
const status = ref<"rendering" | "ready" | "error">("rendering");
const error = ref("");
const playing = ref(false);
let wantsPlay = true;
let currentHost: HTMLElement | undefined;
let runId = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

const message = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause));

/** Mounts the code into a hidden host and swaps it in once it is drawn, so the last good preview stays on error. */
async function render() {
  clearTimeout(timer);
  const id = ++runId;
  const host = document.createElement("div");
  host.className = "tellu-demo-canvas tellu-playground-host";
  host.dataset.pending = "";
  hosts.value!.append(host);
  status.value = "rendering";

  let mountError: unknown;
  const onError = (cause: unknown) => {
    if (id !== runId) return;
    if (host !== currentHost) mountError ??= cause;
    else showError(cause);
  };
  try {
    const { run } = await import("./run");
    const { loop, still } = preset.value;
    const next = await run(host, codes[mode.value], { mode: mode.value, loop, still, onError });
    if (mountError !== undefined || id !== runId) {
      next.destroy();
      host.remove();
      if (mountError !== undefined) throw mountError;
      return;
    }
    view.value?.destroy();
    currentHost?.remove();
    view.value = next;
    currentHost = host;
    delete host.dataset.pending;
    error.value = "";
    status.value = "ready";
    syncPlayback();
  } catch (cause) {
    host.remove();
    if (id === runId) showError(cause);
    console.error(cause);
  }
}

function showError(cause: unknown) {
  error.value = message(cause);
  status.value = "error";
}

function syncPlayback() {
  view.value?.setPlaying(wantsPlay);
  playing.value = view.value?.playing ?? false;
}

function togglePlay() {
  wantsPlay = !playing.value;
  syncPlayback();
}

function onCodeChange(code: string) {
  if (code === codes[mode.value]) return;
  codes[mode.value] = code;
  clearTimeout(timer);
  timer = setTimeout(render, DEBOUNCE_MS);
}

function loadPreset() {
  codes[mode.value] = preset.value.code;
  backdrop.value = preset.value.backdrop ?? "checker";
  editor.value?.setCode(preset.value.code);
  void render();
}

function setMode(next: PlaygroundMode) {
  if (next === mode.value) return;
  mode.value = next;
  backdrop.value = preset.value.backdrop ?? "checker";
  editor.value?.setMode(next, codes[next]);
  void render();
}

watch(isDark, (dark) => editor.value?.setDark(dark));

onMounted(async () => {
  wantsPlay = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  void render();
  const { createEditor } = await import("./editor");
  editor.value = createEditor(editorElement.value!, { dark: isDark.value, onChange: onCodeChange });
  editor.value.setMode(mode.value, codes[mode.value]);
});

onBeforeUnmount(() => {
  clearTimeout(timer);
  runId++;
  view.value?.destroy();
  editor.value?.dispose();
});
</script>

<template>
  <div class="tellu-playground">
    <div class="tellu-playground-toolbar">
      <div class="tellu-playground-modes" role="radiogroup" aria-label="Language">
        <button
          v-for="item in MODES"
          :key="item.value"
          type="button"
          role="radio"
          :aria-checked="mode === item.value"
          @click="setMode(item.value)"
        >
          {{ item.label }}
        </button>
      </div>
      <label class="tellu-playground-field">
        <span>Preset</span>
        <select v-model="selected[mode]" @change="loadPreset">
          <optgroup v-for="[group, items] in groups" :key="group" :label="group">
            <option v-for="item in items" :key="item.id" :value="item.id">{{ item.label }}</option>
          </optgroup>
        </select>
      </label>
      <button type="button" class="tellu-playground-reset" title="Load the preset's code again" @click="loadPreset">
        Reset
      </button>
      <label class="tellu-playground-field">
        <span>Backdrop</span>
        <select v-model="backdrop">
          <option v-for="item in BACKDROPS" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>
    </div>
    <div class="tellu-playground-body">
      <div class="tellu-playground-editor">
        <div ref="editorElement" class="tellu-playground-monaco" />
        <span v-if="!editor" class="tellu-playground-hint">Loading editor…</span>
      </div>
      <div class="tellu-playground-preview">
        <div class="tellu-demo-stage tellu-playground-stage" :class="`backdrop-${backdrop}`" :data-status="status">
          <div ref="hosts" class="tellu-playground-hosts" />
          <span v-if="status === 'rendering' && !view" class="tellu-demo-hint">Rendering…</span>
          <button
            v-if="view?.animated"
            type="button"
            class="tellu-demo-play"
            :aria-label="playing ? 'Pause animation' : 'Play animation'"
            @click="togglePlay"
          >
            <svg v-if="playing" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3h3v10H4zM9 3h3v10H9z" /></svg>
            <svg v-else viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" /></svg>
          </button>
        </div>
        <div v-if="error" class="tellu-playground-error" role="alert">{{ error }}</div>
      </div>
    </div>
  </div>
</template>
