/* A browser your agents can drive: the pointer moves on its own. */
import { gsap } from 'gsap';
import { centre, clickAt, flip, k, ks, lines, moveTo, placeAt, show, stageOf, typed, type Builder } from './kit';

const FIELDS = ['name', 'email', 'card'] as const;

export const browser: Builder = (root) => {
  const stage = stageOf(root);
  const p = { cursor: k(root, 'cursor'), ring: k(root, 'ring'), stage };
  const tl = gsap.timeline({ paused: true });

  // aim points, measured on the final frame
  const page = k(root, 'page');
  const enter = centre(page, stage, page.offsetWidth * 0.35, -page.offsetHeight * 0.3);
  const fieldAt = FIELDS.map((f) => centre(k(root, `f-${f}`), stage, -60, 2));
  const pay = centre(k(root, 'pay'), stage, 10, 2);
  const away = centre(page, stage, page.offsetWidth * 0.3, page.offsetHeight * 0.32);

  // the session is asked, and opens its app
  typed(tl, k(root, 'b-prompt'), 0.3);
  lines(tl, [k(root, 'b-open')], 1.3);
  typed(tl, k(root, 'url'), 1.4, 60);
  show(tl, page, 1.5, 0.4);
  FIELDS.forEach((f) => tl.fromTo(k(root, `v-${f}`), { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 100% 0 0)', duration: 0.01 }, 0));

  // it fills the form, one field after another
  placeAt(tl, p, enter, 0);
  show(tl, p.cursor, 2.0, 0.25);
  FIELDS.forEach((f, i) => {
    const at = 2.2 + i * 1.5;
    const field = k(root, `f-${f}`);
    moveTo(tl, p, fieldAt[i], at, 0.6);
    clickAt(tl, p, fieldAt[i], at + 0.62);
    flip(tl, field, 'input', at + 0.65, 'input focus');
    lines(tl, [k(root, `b-${f}`)], at + 0.7);
    typed(tl, k(root, `v-${f}`), at + 0.75, f === 'card' ? 28 : 24);
    tl.set(field, { attr: { class: 'input' } }, at + 1.5);
  });

  // presses Pay, which fails, and takes a screenshot
  moveTo(tl, p, pay, 6.7, 0.6);
  clickAt(tl, p, pay, 7.32);
  flip(tl, k(root, 'pay'), 'pay', 7.32, 'pay down');
  tl.set(k(root, 'pay'), { attr: { class: 'pay' } }, 7.5);
  lines(tl, [k(root, 'b-click')], 7.4);
  show(tl, k(root, 'err'), 7.9, 0.3, { y: -4 });
  moveTo(tl, p, away, 8.1, 0.7);
  lines(tl, [k(root, 'b-shot')], 8.5);
  tl.fromTo(k(root, 'flash'), { autoAlpha: 0 }, { autoAlpha: 0.85, duration: 0.06, yoyo: true, repeat: 1, ease: 'none' }, 8.6);
  tl.to(p.cursor, { autoAlpha: 0, duration: 0.3 }, 9.0);

  // and reports what broke
  lines(tl, ks(root, 'b-rep'), 9.2, 0.35);
  return tl;
};
