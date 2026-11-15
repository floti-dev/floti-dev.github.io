/* Composition: three projects and a profile become one session, and the
 * agent makes one change across two of the repositories. */
import { gsap } from 'gsap';
import { centre, flip, hide, k, ks, lines, show, stageOf, typed, type Builder } from './kit';

const PROJECTS = ['harbor', 'tidewater', 'lantern'] as const;

export const compose: Builder = (root) => {
  const stage = stageOf(root);
  const tl = gsap.timeline({ paused: true });
  const tab = k(root, 'tab');
  const pill = k(root, 'pill');
  const pslabs = PROJECTS.map((p) => k(root, `pslab-${p}`));
  const fslabs = ks(root, 'fslab');

  // measured on the final frame, before any tween moves a thing; the pill is
  // centred by xPercent, so its own centre sits half its width to the left
  const tabWidth = tab.offsetWidth;
  const from = centre(pill, stage, -pill.offsetWidth / 2);
  const to = centre(tab, stage);

  // the workspace picks its projects; each joins carrying its own config
  PROJECTS.forEach((p, i) => {
    const at = 0.5 + i * 0.95;
    const pick = k(root, `pick-${p}`);
    flip(tl, pick, 'pick idle', at, 'pick on flash');
    tl.set(pick, { attr: { class: 'pick on' } }, at + 0.45);
    show(tl, pslabs[i], at + 0.15, 0.45, { x: -60 });
  });

  // the profile's shared layers go on top
  flip(tl, k(root, 'prof'), 'prof', 3.4, 'prof on');
  show(tl, k(root, 'join'), 3.5, 0.3);
  show(tl, fslabs, 3.7, 0.4, { x: -40 }, 0.28);

  // the stack launches as one session
  tl.to([...pslabs, ...fslabs], { scale: 0.97, duration: 0.16, yoyo: true, repeat: 1, stagger: 0.035, ease: 'power1.inOut' }, 5.0);
  tl.set(pill, { xPercent: -50 }, 0);
  show(tl, pill, 5.4, 0.3, { scale: 0.85, y: 6 });
  tl.to(pill, { x: to.x - from.x, y: to.y - from.y, scale: 0.6, autoAlpha: 0, duration: 0.7, ease: 'power2.in' }, 6.0);
  tl.fromTo(tab, { width: 0, paddingLeft: 0, paddingRight: 0, autoAlpha: 0 }, { width: tabWidth, paddingLeft: 12, paddingRight: 12, autoAlpha: 1, duration: 0.35 }, 6.7);
  hide(tl, k(root, 'term-empty'), 6.8, 0.2);
  show(tl, k(root, 'term'), 6.85, 0.2);

  // the launch folder links the three real repositories
  lines(tl, ks(root, 'tl'), 7.0, 0.2);

  // one change across two of them
  typed(tl, k(root, 't-prompt'), 8.6);
  lines(tl, [k(root, 't-api')], 10.0);
  tl.fromTo(pslabs[0], { scale: 1 }, { scale: 1.04, duration: 0.2, yoyo: true, repeat: 1, immediateRender: false }, 10.0);
  lines(tl, [k(root, 't-web')], 10.7);
  tl.fromTo(pslabs[1], { scale: 1 }, { scale: 1.04, duration: 0.2, yoyo: true, repeat: 1, immediateRender: false }, 10.7);
  lines(tl, [k(root, 't-done')], 11.4);
  return tl;
};
