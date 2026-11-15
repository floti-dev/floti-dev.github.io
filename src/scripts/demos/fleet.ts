/* Agents that run agents: a lead launches three helpers and hears back. */
import { gsap } from 'gsap';
import { centre, k, ks, show, stageOf, startHidden, typed, type Builder } from './kit';

const HELPERS = ['scout', 'tester', 'docs'] as const;

export const fleet: Builder = (root) => {
  const stage = stageOf(root);
  const tl = gsap.timeline({ paused: true });
  const lead = k(root, 'lead');
  const wakes = ks(root, 'wake');
  const helpers = ks(root, 'helper');
  const ships = ks(root, 'ship');
  const logs = ks(root, 'log');
  // measured before any tween moves a thing
  const harbour = centre(lead, stage, 64, 0);
  const starts = HELPERS.map((name) => centre(k(root, `rep-${name}`), stage));

  // the lead gives the order
  tl.fromTo(lead, { scale: 1 }, { scale: 1.05, duration: 0.25, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 0.4);

  HELPERS.forEach((name, i) => {
    const at = 0.9 + i * 0.45;
    // a wake opens and the helper sails out along it
    tl.fromTo(wakes[i], { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.55, ease: 'power2.out' }, at);
    show(tl, helpers[i], at + 0.25, 0.5, { x: -70 });
    tl.fromTo(ships[i], { rotation: -6 }, { rotation: 0, duration: 1.2, ease: 'elastic.out(1, 0.5)' }, at + 0.25);
    show(tl, k(root, `work-${name}`), at + 0.3, 0.01);
    startHidden(tl, k(root, `final-${name}`));
    typed(tl, k(root, `t-${name}`), at + 0.7, 46);
    show(tl, k(root, `o-${name}`), at + 1.7 + i * 0.5, 0.2);
  });

  // reports travel back up the wakes to the lead, one by one
  HELPERS.forEach((name, i) => {
    const at = 3.8 + i * 1.35;
    const rep = k(root, `rep-${name}`);
    const from = starts[i];
    tl.fromTo(rep, { autoAlpha: 0, x: 0, y: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.25, ease: 'back.out(2)' }, at);
    tl.to(rep, { x: harbour.x - from.x, y: harbour.y - from.y, duration: 0.85, ease: 'power2.inOut' }, at + 0.35);
    tl.to(rep, { autoAlpha: 0, scale: 0.7, duration: 0.2 }, at + 1.15);
    tl.to(k(root, `work-${name}`), { autoAlpha: 0, duration: 0.15 }, at);
    tl.to(k(root, `final-${name}`), { autoAlpha: 1, duration: 0.2 }, at + 0.05);
    show(tl, logs[i], at + 1.15, 0.3, { x: -10 });
    tl.fromTo(lead, { scale: 1 }, { scale: 1.035, duration: 0.15, yoyo: true, repeat: 1, immediateRender: false }, at + 1.1);
  });
  return tl;
};
