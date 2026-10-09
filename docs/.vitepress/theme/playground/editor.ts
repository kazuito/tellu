import types from "virtual:tellu-playground-types";
import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
import TypeScriptWorker from "monaco-editor/language/typescript/ts.worker.js?worker";
import type { PlaygroundMode } from "./presets";

self.MonacoEnvironment = {
  getWorker: (_, label) =>
    label === "typescript" || label === "javascript" ? new TypeScriptWorker() : new EditorWorker(),
};

const { typescriptDefaults, ScriptTarget, ModuleKind, ModuleResolutionKind, JsxEmit } = monaco.typescript;
typescriptDefaults.setCompilerOptions({
  target: ScriptTarget.ESNext,
  module: ModuleKind.ESNext,
  moduleResolution: ModuleResolutionKind.NodeJs,
  jsx: JsxEmit.ReactJSX,
  lib: ["esnext", "dom", "dom.iterable"],
  strict: true,
  // Docs examples rely on contextual typing (`glyphTransform: (glyph) => …`), which a bare `export default {}` lacks.
  noImplicitAny: false,
  esModuleInterop: true,
  allowNonTsExtensions: true,
  skipLibCheck: true,
});
typescriptDefaults.setExtraLibs(Object.entries(types).map(([filePath, content]) => ({ filePath, content })));
typescriptDefaults.setEagerModelSync(true);

const FILES: Record<PlaygroundMode, string> = { ts: "file:///caption.ts", react: "file:///App.tsx" };

export interface PlaygroundEditor {
  /** Switches to the mode's own model, so each mode keeps its code. */
  setMode(mode: PlaygroundMode, initialCode: string): void;
  setCode(code: string): void;
  getCode(): string;
  setDark(dark: boolean): void;
  dispose(): void;
}

export function createEditor(
  element: HTMLElement,
  { dark, onChange }: { dark: boolean; onChange: (code: string) => void },
): PlaygroundEditor {
  const models = new Map<PlaygroundMode, monaco.editor.ITextModel>();
  const editor = monaco.editor.create(element, {
    theme: dark ? "vs-dark" : "vs",
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 13,
    lineHeight: 20,
    tabSize: 2,
    scrollBeyondLastLine: false,
    padding: { top: 12, bottom: 12 },
    fixedOverflowWidgets: true,
  });
  editor.onDidChangeModelContent(() => onChange(editor.getValue()));

  return {
    setMode(mode, initialCode) {
      let model = models.get(mode);
      if (!model) {
        model = monaco.editor.createModel(initialCode, "typescript", monaco.Uri.parse(FILES[mode]));
        models.set(mode, model);
      }
      editor.setModel(model);
    },
    setCode(code) {
      const model = editor.getModel()!;
      // An edit instead of setValue, so loading a preset can be undone.
      editor.pushUndoStop();
      editor.executeEdits("preset", [{ range: model.getFullModelRange(), text: code }]);
      editor.pushUndoStop();
      editor.setPosition({ lineNumber: 1, column: 1 });
      editor.setScrollTop(0);
    },
    getCode: () => editor.getValue(),
    setDark(dark) {
      monaco.editor.setTheme(dark ? "vs-dark" : "vs");
    },
    dispose() {
      editor.dispose();
      for (const model of models.values()) model.dispose();
    },
  };
}
