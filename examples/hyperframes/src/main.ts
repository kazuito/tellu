import { createCaption } from "./caption";
import { FPS, SCENES } from "./scenes";

declare global {
  interface Window {
    telluCaptions: { attach: typeof attach };
  }
}

/**
 * Draws the captions of the sub-composition `id` into the page and adds a tween to its `timeline` that redraws them
 * for the time it is seeked to. Resolves once the fonts are loaded and the first frame is drawn.
 */
async function attach(id: string, timeline: gsap.core.Timeline, duration: number): Promise<void> {
  const specs = SCENES[id];
  if (!specs) throw new Error(`No captions for composition "${id}"`);
  const captions = await Promise.all(specs.map(createCaption));

  const render = (time: number) => {
    // Rounded so that a frame boundary doesn't land a hair early.
    const frame = Math.round(time * FPS * 1e6) / 1e6;
    for (const caption of captions) caption.render(frame);
  };

  // GSAP sets the tweened value on every seek, so the setter redraws whether or not callbacks fire.
  const playhead = {
    get time() {
      return 0;
    },
    set time(value: number) {
      render(value);
    },
  };
  timeline.to(playhead, { time: duration, duration, ease: "none" }, 0);
  render(0);
}

window.telluCaptions = { attach };
