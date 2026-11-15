/* Runs the demos: scales each stage to its column, builds its timeline just
 * before it comes into view, plays it once on entry, pauses it off screen,
 * and wires its replay (or, for the looping hero, pause) button. Under
 * reduced motion nothing plays on its own: each demo keeps its final frame
 * and its button says Play.
 *
 * A few more things for the demos that need them:
 * - An interactive demo (data-interactive) is built as soon as the page is
 *   ready, so its own controls work at once, reduced motion included.
 * - A demo that waits for the visitor sets data-waiting on its root; while it
 *   is set, coming back on screen does not resume it.
 * - Each demo has two layouts of the same elements: the drawing, scaled to
 *   its column, and below PHONE_QUERY a phone layout drawn at its own size.
 *   root.dataset.layout says which one a timeline was built for. A builder
 *   measures its layout, so when the layout changes (or a phone layout
 *   changes width) the demo is torn down and built again, and plays again
 *   from its start if it was on screen.
 * - On a non-interactive demo, a tap on the drawing replays it once it has
 *   finished (or plays it, under reduced motion), as its button does.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PHONE_QUERY, type Builder, type DemoContext, type Timeline } from './demos/kit';
import { hero } from './demos/hero';
import { compose } from './demos/compose';
import { fleet } from './demos/fleet';
import { plugins } from './demos/plugins';
import { browser } from './demos/browser';
import { persist } from './demos/persist';

const BUILDERS: Record<string, Builder> = { hero, compose, fleet, plugins, browser, persist };

/** A phone layout narrower or wider than this, since it was built, is built again. */
const REFLOW_PX = 24;

const phoneQuery = window.matchMedia(PHONE_QUERY);

type Mode = 'play' | 'pause' | 'replay';

/** Scales a stage drawn at --w by --h pixels to the width it is given, up to
 * its --s-max. A phone layout is drawn at the size it is shown (global.css),
 * so it keeps a scale of 1. */
export function fitStages(): void {
  document.querySelectorAll<HTMLElement>('.stage').forEach((stage) => {
    const apply = () => {
      const style = getComputedStyle(stage);
      const w = Number.parseFloat(style.getPropertyValue('--w'));
      if (!Number.isFinite(w) || w <= 0) return;
      const max = Number.parseFloat(style.getPropertyValue('--s-max'));
      const scale = phoneQuery.matches ? 1 : Math.min(Number.isFinite(max) ? max : 1, stage.clientWidth / w);
      stage.style.setProperty('--s', String(scale));
      stage.dataset.fit = '';
    };
    new ResizeObserver(apply).observe(stage);
    phoneQuery.addEventListener('change', apply);
    apply();
  });
}

export function initDemos(reduced: boolean): void {
  document.querySelectorAll<HTMLElement>('[data-demo]').forEach((root) => setup(root, reduced));
}

function setup(root: HTMLElement, reduced: boolean): void {
  const build = BUILDERS[root.dataset.demo ?? ''];
  const button = root.querySelector<HTMLButtonElement>('.replay');
  const label = button?.querySelector<HTMLElement>('.replay-label');
  const stage = root.querySelector<HTMLElement>('.stage');
  if (!build || !button || !label || !stage) return;

  const loop = root.dataset.loop === 'true';
  const interactive = root.dataset.interactive === 'true';
  let tl: Timeline | null = null;
  let broken = false;
  let started = false;
  let held = false; // paused by the visitor
  let visible = true;
  let watchers: Array<(on: boolean) => void> = [];
  let abort = new AbortController();
  let builtPhone = phoneQuery.matches;
  let builtWidth = 0;

  root.dataset.layout = builtPhone ? 'phone' : 'wide';

  // the wording of each mode is copy.yaml's, carried on the button
  const setMode = (mode: Mode) => {
    button.dataset.mode = mode;
    label.textContent = button.dataset[`label${mode[0].toUpperCase()}${mode.slice(1)}`] ?? mode;
  };

  const ensure = (): Timeline | null => {
    if (tl || broken) return tl;
    try {
      watchers = [];
      abort = new AbortController();
      builtPhone = phoneQuery.matches;
      builtWidth = stage.clientWidth;
      root.dataset.layout = builtPhone ? 'phone' : 'wide';
      const ctx: DemoContext = {
        reduced,
        phone: builtPhone,
        signal: abort.signal,
        visible: () => visible,
        onVisibility: (watch) => {
          watchers.push(watch);
        },
      };
      tl = build(root, ctx);
      tl.eventCallback('onComplete', () => setMode('replay'));
    } catch (error) {
      // a demo that cannot build keeps its final frame; the page goes on
      broken = true;
      button.hidden = true;
      console.error(`demo "${root.dataset.demo}"`, error);
    }
    return tl;
  };

  /** Undoes a build: every inline style its timeline set goes, its listeners
   * and pending calls with it, and the markup is the final frame again. */
  const teardown = () => {
    if (!tl) return;
    abort.abort();
    const old = tl;
    tl = null;
    old.revert();
    gsap.killTweensOf(Array.from(root.querySelectorAll('*')));
    delete root.dataset.waiting;
    started = false;
    held = false;
  };

  const start = () => {
    const t = ensure();
    if (!t) return;
    started = true;
    held = false;
    t.restart();
    if (!visible) t.pause();
    setMode(loop ? 'pause' : 'replay');
  };

  // the layout a timeline was built for has changed: build it again
  let pending = 0;
  const relayout = () => {
    pending = 0;
    const phone = phoneQuery.matches;
    if (!tl) {
      root.dataset.layout = phone ? 'phone' : 'wide';
      return;
    }
    const moved = phone !== builtPhone || (phone && Math.abs(stage.clientWidth - builtWidth) >= REFLOW_PX);
    if (!moved) return;
    const wasStarted = started;
    teardown();
    const t = ensure();
    if (!t) return;
    if (reduced) {
      // the final frame again; Play still plays it
      if (!interactive) t.progress(1, true);
      setMode('play');
    } else if (loop || (wasStarted && visible)) {
      start();
    } else {
      t.pause(0);
      setMode('replay');
    }
    ScrollTrigger.refresh();
  };
  const schedule = () => {
    window.clearTimeout(pending);
    pending = window.setTimeout(relayout, 160);
  };
  phoneQuery.addEventListener('change', schedule);
  new ResizeObserver(schedule).observe(stage);

  button.addEventListener('click', () => {
    if (!loop || !started) return start();
    const t = ensure();
    if (!t) return;
    if (t.paused()) {
      held = false;
      t.resume();
      setMode('pause');
    } else {
      held = true;
      t.pause();
      setMode('play');
    }
  });

  // a tap on a finished drawing replays it; the button stays the way in for
  // keyboards and screen readers, since the drawing itself is hidden from them
  if (!loop && !interactive) {
    stage.addEventListener('click', () => {
      const mode = button.dataset.mode;
      if (mode === 'play' || (mode === 'replay' && (!started || (tl?.progress() ?? 1) === 1))) start();
    });
  }

  // off screen, a demo pauses; back on screen, it carries on
  ScrollTrigger.create({
    trigger: root,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => {
      visible = self.isActive;
      watchers.forEach((watch) => watch(visible));
      if (!tl || !started) return;
      if (!visible) tl.pause();
      else if (!held && root.dataset.waiting === undefined && (loop || tl.progress() < 1)) tl.resume();
    },
  });

  if (interactive) ensure();

  if (reduced) {
    setMode('play');
    return;
  }

  if (loop) {
    start();
    return;
  }

  setMode('replay');
  // set the start frame up while the demo is still below the fold …
  ScrollTrigger.create({
    trigger: root,
    start: 'top bottom+=320',
    end: 'max',
    once: true,
    onEnter: () => {
      if (!started) ensure()?.pause(0);
    },
  });
  // … and play it the first time it is well into view (again after a
  // layout change, if it was off screen then)
  const first = () => {
    if (!started) start();
  };
  ScrollTrigger.create({ trigger: root, start: 'top 72%', end: 'bottom 28%', onEnter: first, onEnterBack: first });
}
