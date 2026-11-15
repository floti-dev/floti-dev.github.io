/* One window, every machine: two hosts join the sidebar over SSH. */
import { gsap } from 'gsap';
import { flip, hide, k, ks, lines, show, startHidden, type Builder, type Timeline } from './kit';

/** A host's group opens, says how far along it is, then lists its sessions. */
function join(tl: Timeline, root: HTMLElement, name: 'build' | 'laptop', height: number, at: number): void {
  const group = k(root, `host-${name}`);
  tl.fromTo(group, { height: 0 }, { height, duration: 0.45, ease: 'power2.out' }, at);
  flip(tl, k(root, `${name}-dot`), 'dot ring wait', at + 1.0, 'dot ring');
  show(tl, k(root, `${name}-connecting`), at, 0.01);
  tl.to(k(root, `${name}-connecting`), { autoAlpha: 0, duration: 0.1 }, at + 0.9);
  show(tl, k(root, `${name}-loading`), at + 0.95, 0.1);
  tl.to(k(root, `${name}-loading`), { autoAlpha: 0, duration: 0.1 }, at + 1.5);
  startHidden(tl, k(root, `${name}-ms`));
  tl.to(k(root, `${name}-ms`), { autoAlpha: 1, duration: 0.2 }, at + 1.55);
  show(tl, k(root, `st-${name}`), at + 1.55, 0.25);
}

export const machines: Builder = (root) => {
  const tl = gsap.timeline({ paused: true });
  const buildH = k(root, 'host-build').offsetHeight;
  const laptopH = k(root, 'host-laptop').offsetHeight;
  const tabTester = k(root, 'tab-tester');
  const tabW = tabTester.offsetWidth;

  // start: This PC alone, its session in front
  flip(tl, k(root, 'row-fix'), 'fw-row session sel', 6.6, 'fw-row session');
  flip(tl, k(root, 'tab-fix'), 'fw-tab on', 6.6, 'fw-tab');

  // build-box joins, and its sessions arrive
  join(tl, root, 'build', buildH, 0.6);
  show(tl, [...ks(root, 'build-row'), k(root, 'row-tester')], 2.3, 0.3, { x: -8 }, 0.18);
  show(tl, k(root, 'rail-badge'), 2.6, 0.3, { scale: 0 });
  show(tl, k(root, 'st-need'), 2.6, 0.25);

  // then the laptop
  join(tl, root, 'laptop', laptopH, 3.4);
  show(tl, ks(root, 'laptop-row'), 5.1, 0.3, { x: -8 }, 0.18);

  // tester, started by fix upload retry on this PC, runs on build-box
  flip(tl, k(root, 'row-tester'), 'fw-row session', 6.0, 'fw-row session hot');
  tl.set(k(root, 'row-tester'), { attr: { class: 'fw-row session sel need' } }, 6.6);
  tl.fromTo(tabTester, { width: 0, paddingLeft: 0, paddingRight: 0, autoAlpha: 0 }, { width: tabW, paddingLeft: 12, paddingRight: 14, autoAlpha: 1, duration: 0.35 }, 6.6);
  hide(tl, k(root, 'view-fix'), 6.7, 0.2);
  hide(tl, k(root, 'crumb-fix'), 6.7, 0.15);
  show(tl, k(root, 'view-tester'), 6.75, 0.2);
  show(tl, k(root, 'crumb-tester'), 6.75, 0.2);
  lines(tl, ks(root, 'tt'), 6.9, 0.32);
  return tl;
};
