/* Shared pieces for the demo timelines.
 *
 * Every demo's markup is its final frame. A builder makes a paused timeline
 * whose first frame is the demo's start: elements that arrive later begin
 * with fromTo() (which applies its from-values at once), and discrete changes
 * are attribute sets placed on the timeline, so replaying from 0 restores the
 * start exactly. Colours are never tweened inline: a class carries every
 * colour, so the palette toggle recolours a demo mid-play. */
import { gsap } from 'gsap';

export type Timeline = gsap.core.Timeline;

/** What the runtime tells a demo about where it stands. */
export interface DemoContext {
  reduced: boolean;
  visible(): boolean;
  /** Called whenever the demo goes off screen or comes back. */
  onVisibility(watch: (on: boolean) => void): void;
}

export type Builder = (root: HTMLElement, ctx: DemoContext) => Timeline;

/** The wording a demo's script shows, from copy.yaml (Demo's `text`). */
export function textOf(root: HTMLElement): Record<string, string> {
  try {
    return JSON.parse(root.dataset.text ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

export function k(root: HTMLElement, key: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(`[data-k="${key}"]`);
  if (!el) throw new Error(`demo element "${key}" is missing`);
  return el;
}

export function ks(root: HTMLElement, key: string): HTMLElement[] {
  const els = Array.from(root.querySelectorAll<HTMLElement>(`[data-k="${key}"]`));
  if (els.length === 0) throw new Error(`demo elements "${key}" are missing`);
  return els;
}

export function stageOf(root: HTMLElement): HTMLElement {
  const stage = root.querySelector<HTMLElement>('.stage-in');
  if (!stage) throw new Error('demo has no stage');
  return stage;
}

export interface Point {
  x: number;
  y: number;
}

/** An element's centre in the stage's own (unscaled) pixels. */
export function centre(el: HTMLElement, stage: HTMLElement, dx = 0, dy = 0): Point {
  const r = el.getBoundingClientRect();
  const s = stage.getBoundingClientRect();
  const scale = s.width / stage.offsetWidth || 1;
  return {
    x: (r.left - s.left + r.width / 2) / scale + dx,
    y: (r.top - s.top + r.height / 2) / scale + dy,
  };
}

/** Transform offsets an element can arrive from; it always lands at rest. */
export interface Offset {
  x?: number;
  y?: number;
  xPercent?: number;
  yPercent?: number;
  scale?: number;
}

const REST = { x: 0, y: 0, xPercent: 0, yPercent: 0, scale: 1 } as const;

function restFor(from: Offset): Offset {
  const out: Offset = {};
  for (const key of Object.keys(from) as Array<keyof Offset>) out[key] = REST[key];
  return out;
}

/** Shows an element that is hidden in the start frame. */
export function show(tl: Timeline, targets: gsap.TweenTarget, at: number | string, duration = 0.35, from: Offset = {}, stagger = 0): Timeline {
  return tl.fromTo(targets, { autoAlpha: 0, ...from }, { autoAlpha: 1, ...restFor(from), duration, stagger, ease: 'power2.out' }, at);
}

/** Hides an element that is shown in the start frame. */
export function hide(tl: Timeline, targets: gsap.TweenTarget, at: number | string, duration = 0.3): Timeline {
  return tl.fromTo(targets, { autoAlpha: 1 }, { autoAlpha: 0, duration, ease: 'power1.in' }, at);
}

/** Hidden in the start frame and until a later tween shows it again. */
export function startHidden(tl: Timeline, targets: gsap.TweenTarget): Timeline {
  return tl.fromTo(targets, { autoAlpha: 0 }, { autoAlpha: 0, duration: 0.01 }, 0);
}

/** Shown in the start frame, though hidden at rest; a later tween hides it. */
export function startShown(tl: Timeline, targets: gsap.TweenTarget): Timeline {
  return tl.fromTo(targets, { autoAlpha: 1 }, { autoAlpha: 1, duration: 0.01 }, 0);
}

/** Terminal lines arriving one after another. */
export function lines(tl: Timeline, els: HTMLElement[], at: number, gap = 0.45): Timeline {
  els.forEach((el, i) => {
    tl.fromTo(el, { autoAlpha: 0, y: 3 }, { autoAlpha: 1, y: 0, duration: 0.18, ease: 'power1.out' }, at + i * gap);
  });
  return tl;
}

/** A line typed out character by character. */
export function typed(tl: Timeline, el: HTMLElement, at: number, cps = 38): Timeline {
  const chars = Math.max(1, (el.textContent ?? '').length);
  tl.fromTo(
    el,
    { clipPath: 'inset(0 100% 0 0)', autoAlpha: 1 },
    { clipPath: 'inset(0 0% 0 0)', duration: chars / cps, ease: `steps(${chars})` },
    at,
  );
  return tl;
}

/** Rows of a tree that grow in, pushing the rows below them down. */
export function grow(tl: Timeline, els: HTMLElement[], at: number, gap = 0.18, height = 26): Timeline {
  els.forEach((el, i) => {
    tl.fromTo(el, { height: 0, autoAlpha: 0 }, { height, autoAlpha: 1, duration: 0.35, ease: 'power2.out' }, at + i * gap);
  });
  return tl;
}

/** Swaps an element's class list at a moment on the timeline. */
export function cls(tl: Timeline, el: HTMLElement, at: number, value: string): Timeline {
  return tl.set(el, { attr: { class: value } }, at);
}

/** A class list for the start frame and another from `at` on. */
export function flip(tl: Timeline, el: HTMLElement, start: string, at: number, end: string): Timeline {
  cls(tl, el, 0, start);
  return cls(tl, el, at, end);
}

export interface Pointer {
  cursor: HTMLElement;
  ring: HTMLElement;
  stage: HTMLElement;
}

/** The pointer's tip sits at (2, 2) inside its drawing. */
export function moveTo(tl: Timeline, p: Pointer, to: Point, at: number, duration = 0.9): Timeline {
  return tl.to(p.cursor, { x: to.x - 2, y: to.y - 2, duration, ease: 'power2.inOut' }, at);
}

export function placeAt(tl: Timeline, p: Pointer, to: Point, at: number): Timeline {
  return tl.set(p.cursor, { x: to.x - 2, y: to.y - 2 }, at);
}

export function clickAt(tl: Timeline, p: Pointer, to: Point, at: number): Timeline {
  tl.set(p.ring, { left: to.x, top: to.y }, at);
  tl.fromTo(p.ring, { scale: 0.4, opacity: 0.9 }, { scale: 1.5, opacity: 0, duration: 0.5, ease: 'power2.out', immediateRender: false }, at);
  tl.to(p.cursor, { scale: 0.86, duration: 0.08, yoyo: true, repeat: 1, transformOrigin: '2px 2px' }, at);
  return tl;
}

/** Natural width of an element that is display:none at rest. */
export function naturalWidth(el: HTMLElement, display = 'flex'): number {
  const prev = el.style.display;
  el.style.display = display;
  const w = el.offsetWidth;
  el.style.display = prev;
  return w;
}
