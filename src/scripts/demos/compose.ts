/* Composition: two profiles, two stacks, two sessions of one repository. */
import { gsap } from 'gsap';
import { centre, flip, hide, k, ks, lines, show, stageOf, type Builder, type Point, type Timeline } from './kit';

type Profile = 'backend' | 'review';

function launch(tl: Timeline, root: HTMLElement, name: Profile, at: number, from: Point, to: Point): void {
  const slabs = ks(root, `slab-${name}`);
  const pill = k(root, `pill-${name}`);
  tl.set(pill, { xPercent: -50 }, 0);
  // the layers press together into one session …
  tl.to(slabs, { scale: 0.97, duration: 0.18, yoyo: true, repeat: 1, stagger: 0.04, ease: 'power1.inOut' }, at);
  show(tl, pill, at + 0.3, 0.3, { scale: 0.85, y: 6 });
  // … which sails across to the window and becomes its tab
  tl.to(pill, { x: to.x - from.x, y: to.y - from.y, scale: 0.6, autoAlpha: 0, duration: 0.7, ease: 'power2.in' }, at + 1.0);
}

export const compose: Builder = (root) => {
  const tl = gsap.timeline({ paused: true });
  const tabB = k(root, 'tab-backend');
  const tabR = k(root, 'tab-review');
  const tabBWidth = tabB.offsetWidth;
  const tabRWidth = tabR.offsetWidth;
  // measured on the final frame, before any tween moves a thing; the pill is
  // centred by xPercent, so its own centre sits half its width to the left
  const stage = stageOf(root);
  const travel = (name: Profile): [Point, Point] => {
    const pill = k(root, `pill-${name}`);
    const c = centre(pill, stage, -pill.offsetWidth / 2);
    return [c, centre(k(root, `tab-${name}`), stage)];
  };
  const [bFrom, bTo] = travel('backend');
  const [rFrom, rTo] = travel('review');

  // start: the backend profile is picked, nothing composed, no session
  flip(tl, k(root, 'prof-backend'), 'prof on', 5.9, 'prof');
  flip(tl, k(root, 'prof-review'), 'prof', 5.9, 'prof on');
  show(tl, k(root, 'stack-backend'), 0, 0.01);
  hide(tl, k(root, 'term-empty'), 4.4, 0.2);

  // backend's five layers slide in and stack
  show(tl, ks(root, 'slab-backend'), 0.5, 0.45, { x: -48 }, 0.42);
  launch(tl, root, 'backend', 2.9, bFrom, bTo);
  tl.fromTo(tabB, { width: 0, paddingLeft: 0, paddingRight: 0, autoAlpha: 0 }, { width: tabBWidth, paddingLeft: 12, paddingRight: 12, autoAlpha: 1, duration: 0.35 }, 4.3);
  show(tl, k(root, 'term-backend'), 4.4, 0.2);
  lines(tl, ks(root, 'tb'), 4.6, 0.22);

  // the review profile composes a different stack for the same repository
  tl.to(ks(root, 'slab-backend'), { x: 40, autoAlpha: 0, duration: 0.35, stagger: 0.05, ease: 'power1.in' }, 6.0);
  show(tl, k(root, 'stack-review'), 6.0, 0.01);
  show(tl, ks(root, 'slab-review'), 6.5, 0.45, { x: -48 }, 0.42);
  launch(tl, root, 'review', 8.3, rFrom, rTo);
  tl.fromTo(tabR, { width: 0, paddingLeft: 0, paddingRight: 0, autoAlpha: 0 }, { width: tabRWidth, paddingLeft: 12, paddingRight: 12, autoAlpha: 1, duration: 0.35 }, 9.7);
  flip(tl, tabR, 'tab', 9.7, 'tab on');
  flip(tl, tabB, 'tab on', 9.7, 'tab');
  tl.to(k(root, 'term-backend'), { autoAlpha: 0, duration: 0.2 }, 9.75);
  show(tl, k(root, 'term-review'), 9.8, 0.2);
  lines(tl, ks(root, 'tr'), 10.0, 0.22);
  return tl;
};
