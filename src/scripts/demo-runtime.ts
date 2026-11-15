/* Runs the demos: scales each stage to its column, builds its timeline just
 * before it comes into view, plays it once on entry, pauses it off screen,
 * and wires its replay (or, for the looping hero, pause) button. Under
 * reduced motion nothing plays on its own: each demo keeps its final frame
 * and its button says Play. */
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Builder, Timeline } from './demos/kit';
import { hero } from './demos/hero';
import { compose } from './demos/compose';
import { fleet } from './demos/fleet';
import { machines } from './demos/machines';
import { plugins } from './demos/plugins';
import { browser } from './demos/browser';
import { persist } from './demos/persist';

const BUILDERS: Record<string, Builder> = { hero, compose, fleet, machines, plugins, browser, persist };

type Mode = 'play' | 'pause' | 'replay';
const LABELS: Record<Mode, string> = { play: 'Play', pause: 'Pause', replay: 'Replay' };

/** Scales a stage drawn at --w by --h pixels to the width it is given. */
export function fitStages(): void {
  document.querySelectorAll<HTMLElement>('.stage').forEach((stage) => {
    const w = Number.parseFloat(getComputedStyle(stage).getPropertyValue('--w'));
    if (!Number.isFinite(w) || w <= 0) return;
    const apply = () => {
      stage.style.setProperty('--s', String(Math.min(1, stage.clientWidth / w)));
      stage.dataset.fit = '';
    };
    new ResizeObserver(apply).observe(stage);
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
  if (!build || !button || !label) return;

  const loop = root.dataset.loop === 'true';
  let tl: Timeline | null = null;
  let broken = false;
  let started = false;
  let held = false; // paused by the visitor
  let visible = true;

  const setMode = (mode: Mode) => {
    button.dataset.mode = mode;
    label.textContent = LABELS[mode];
  };

  const ensure = (): Timeline | null => {
    if (tl || broken) return tl;
    try {
      tl = build(root);
      tl.eventCallback('onComplete', () => setMode('replay'));
    } catch (error) {
      // a demo that cannot build keeps its final frame; the page goes on
      broken = true;
      button.hidden = true;
      console.error(`demo "${root.dataset.demo}"`, error);
    }
    return tl;
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

  // off screen, a demo pauses; back on screen, it carries on
  ScrollTrigger.create({
    trigger: root,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => {
      visible = self.isActive;
      if (!tl || !started) return;
      if (!visible) tl.pause();
      else if (!held && (loop || tl.progress() < 1)) tl.resume();
    },
  });

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
  // … and play it the first time it is well into view
  const first = () => {
    if (!started) start();
  };
  ScrollTrigger.create({ trigger: root, start: 'top 72%', end: 'bottom 28%', onEnter: first, onEnterBack: first });
}
