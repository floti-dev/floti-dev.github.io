/* Plugins: the task board joins the sidebar and its card moves by itself. */
import { gsap } from 'gsap';
import { flip, hide, k, ks, lines, show, startHidden, startShown, typed, type Builder } from './kit';

export const plugins: Builder = (root) => {
  const tl = gsap.timeline({ paused: true });
  const card = k(root, 'card');
  const slot = k(root, 'slot');

  // Where the card starts: in a slot at the top of To do. Open the slot to
  // measure, then close it again; the card's own row in In progress is
  // pushed down by the open slot, so the offset is taken with it open.
  const gap = 6;
  const open = card.offsetHeight + gap;
  slot.style.height = `${open}px`;
  const lift = slot.offsetTop - card.parentElement!.offsetTop;
  slot.style.height = '';

  // start: Sessions in the sidebar, no plugin on the rail yet
  show(tl, k(root, 'rail-tasks'), 0.5, 0.35, { scale: 0.3 });
  flip(tl, k(root, 'rail-sessions'), 'fw-rail-btn on', 1.1, 'fw-rail-btn');
  flip(tl, k(root, 'rail-tasks'), 'fw-rail-btn', 1.1, 'fw-rail-btn on');
  hide(tl, k(root, 'side-sessions'), 1.1, 0.2);
  show(tl, k(root, 'side-tasks'), 1.15, 0.4, { x: -24 });
  show(tl, k(root, 'st-0'), 1.4, 0.2);

  // the session lists the tasks and takes the first through the plugin's tools
  typed(tl, k(root, 'p-prompt'), 1.9);
  lines(tl, ks(root, 'p1'), 3.2, 0.3);
  lines(tl, ks(root, 'p2'), 4.7, 0.45);

  // the card moves to In progress by itself
  const at = 5.6;
  tl.fromTo(slot, { height: open }, { height: 0, duration: 0.6, ease: 'power2.inOut' }, at);
  tl.fromTo(card, { y: lift }, { y: 0, duration: 0.6, ease: 'power2.inOut' }, at);
  tl.fromTo(card, { scale: 1 }, { scale: 1.03, duration: 0.3, yoyo: true, repeat: 1, ease: 'power1.inOut' }, at);
  startShown(tl, k(root, 'empty'));
  tl.to(k(root, 'empty'), { autoAlpha: 0, duration: 0.2 }, at + 0.15);
  startShown(tl, k(root, 'todo-3'));
  tl.to(k(root, 'todo-3'), { autoAlpha: 0, duration: 0.1 }, at + 0.3);
  startHidden(tl, k(root, 'todo-2'));
  tl.to(k(root, 'todo-2'), { autoAlpha: 1, duration: 0.15 }, at + 0.35);
  startShown(tl, k(root, 'prog-0'));
  tl.to(k(root, 'prog-0'), { autoAlpha: 0, duration: 0.1 }, at + 0.5);
  startHidden(tl, k(root, 'prog-1'));
  tl.to(k(root, 'prog-1'), { autoAlpha: 1, duration: 0.15 }, at + 0.55);
  startShown(tl, k(root, 'who-none'));
  tl.to(k(root, 'who-none'), { autoAlpha: 0, duration: 0.1 }, at + 0.6);
  startHidden(tl, k(root, 'who-fix'));
  tl.to(k(root, 'who-fix'), { autoAlpha: 1, duration: 0.2 }, at + 0.65);
  tl.to(k(root, 'st-0'), { autoAlpha: 0, duration: 0.1 }, at + 0.7);
  startHidden(tl, k(root, 'st-1'));
  tl.to(k(root, 'st-1'), { autoAlpha: 1, duration: 0.2 }, at + 0.75);
  lines(tl, ks(root, 'p3'), at + 1.0);
  return tl;
};
