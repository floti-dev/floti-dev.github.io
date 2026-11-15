/* The hero window's 30-second loop. */
import { gsap } from 'gsap';
import { centre, clickAt, flip, grow, hide, k, ks, lines, moveTo, naturalWidth, placeAt, show, stageOf, typed, type Builder } from './kit';

export const hero: Builder = (root) => {
  const stage = stageOf(root);
  const p = { cursor: k(root, 'cursor'), ring: k(root, 'ring'), stage };
  const tl = gsap.timeline({ paused: true, repeat: -1 });
  const win = [root.querySelector('.fw-main'), k(root, 'status')];

  // Where the pointer goes, measured on the final frame (nothing it aims at
  // moves during the loop).
  const harbor = centre(k(root, 'proj-harbor'), stage, -40);
  const go = centre(k(root, 'harbor-go'), stage);
  const files = centre(k(root, 'rail-files'), stage);
  const notes = centre(k(root, 'file-notes'), stage, -30);
  const park = { x: stage.offsetWidth * 0.8, y: stage.offsetHeight * 0.78 };

  const tabFix = k(root, 'tab-fix');
  const tabNotes = k(root, 'tab-notes');
  const tabFixWidth = tabFix.offsetWidth;
  const tabNotesWidth = naturalWidth(tabNotes);

  // 0: the window fades up on its start frame
  tl.fromTo(win, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0);
  placeAt(tl, p, park, 0);
  show(tl, p.cursor, 0.3, 0.3);

  // 0.4: the pointer opens harbor-api from the sidebar and starts a session
  moveTo(tl, p, harbor, 0.4, 1.0);
  flip(tl, k(root, 'proj-harbor'), 'fw-row', 1.4, 'fw-row hot');
  hide(tl, k(root, 'harbor-branch'), 1.45, 0.12);
  show(tl, k(root, 'harbor-go'), 1.45, 0.12);
  moveTo(tl, p, go, 1.6, 0.5);
  clickAt(tl, p, go, 2.15);

  flip(tl, k(root, 'tab-checkout'), 'fw-tab on', 2.2, 'fw-tab');
  flip(tl, tabFix, 'fw-tab', 2.2, 'fw-tab on');
  tl.fromTo(
    tabFix,
    { width: 0, paddingLeft: 0, paddingRight: 0, autoAlpha: 0 },
    { width: tabFixWidth, paddingLeft: 12, paddingRight: 14, autoAlpha: 1, duration: 0.35, ease: 'power2.out' },
    2.2,
  );
  hide(tl, k(root, 'view-checkout'), 2.3, 0.2);
  hide(tl, k(root, 'crumb-checkout'), 2.3, 0.15);
  show(tl, k(root, 'view-fix'), 2.3, 0.25);
  show(tl, k(root, 'crumb-fix'), 2.35, 0.2);
  grow(tl, [k(root, 'row-fix')], 2.4);
  hide(tl, k(root, 'run-1'), 2.4, 0.1);
  show(tl, k(root, 'run-2'), 2.45, 0.15);
  hide(tl, k(root, 'st-1'), 2.4, 0.1);
  show(tl, k(root, 'st-2'), 2.45, 0.15);

  tl.to(k(root, 'harbor-go'), { autoAlpha: 0, duration: 0.15 }, 2.6);
  tl.to(k(root, 'harbor-branch'), { autoAlpha: 1, duration: 0.15 }, 2.65);
  tl.set(k(root, 'proj-harbor'), { attr: { class: 'fw-row' } }, 2.6);
  moveTo(tl, p, park, 2.7, 1.1);
  tl.to(p.cursor, { autoAlpha: 0, duration: 0.3 }, 3.7);

  // 3: the session works
  const fixParent = k(root, 'fam-parent');
  const kids = k(root, 'fam-kids');
  tl.fromTo(fixParent, { width: '100%' }, { width: '55%', duration: 0.7, ease: 'power3.inOut' }, 12.2);
  tl.fromTo(kids, { xPercent: 100 }, { xPercent: 0, duration: 0.7, ease: 'power3.inOut' }, 12.2);
  typed(tl, k(root, 'l-prompt'), 3.0);
  lines(tl, ks(root, 'l'), 4.4, 0.6);

  // 7.4: the other tab turns to "needs you"
  flip(tl, k(root, 'tab-checkout-dot'), 'dot', 7.4, 'dot need');
  show(tl, k(root, 'tab-need'), 7.4, 0.3);
  flip(tl, k(root, 'checkout-dot'), 'dot', 7.4, 'dot need');
  flip(tl, k(root, 'row-checkout'), 'fw-row session', 7.4, 'fw-row session need');
  hide(tl, k(root, 'checkout-2m'), 7.4, 0.15);
  show(tl, k(root, 'checkout-need'), 7.45, 0.25);
  show(tl, k(root, 'rail-badge'), 7.6, 0.3, { scale: 0 });
  tl.to(k(root, 'st-2'), { autoAlpha: 0, duration: 0.1 }, 7.4);
  tl.to(k(root, 'st-1'), { autoAlpha: 1, duration: 0.15 }, 7.45);
  show(tl, k(root, 'st-need'), 7.45, 0.25);

  // 9.8: the session starts two helpers, which join it as a family
  lines(tl, ks(root, 'l2'), 9.8, 0.7);
  grow(tl, ks(root, 'row-kid'), 12.0, 0.22);
  tl.to(k(root, 'run-2'), { autoAlpha: 0, duration: 0.1 }, 12.2);
  show(tl, k(root, 'run-4'), 12.25, 0.15);
  tl.to(k(root, 'st-1'), { autoAlpha: 0, duration: 0.1 }, 12.2);
  show(tl, k(root, 'st-3'), 12.25, 0.15);
  lines(tl, ks(root, 'ks'), 13.0, 0.75);
  lines(tl, ks(root, 'kt'), 13.3, 0.85);
  lines(tl, ks(root, 'l3'), 14.6);

  // 19.6: a note opens in Files
  tl.to(p.cursor, { autoAlpha: 1, duration: 0.25 }, 19.6);
  moveTo(tl, p, files, 19.8, 1.0);
  clickAt(tl, p, files, 20.85);
  flip(tl, k(root, 'rail-sessions'), 'fw-rail-btn on', 20.9, 'fw-rail-btn');
  flip(tl, k(root, 'rail-files'), 'fw-rail-btn', 20.9, 'fw-rail-btn on');
  hide(tl, k(root, 'side-sessions'), 20.9, 0.2);
  show(tl, k(root, 'side-files'), 21.0, 0.25, { x: -8 });
  moveTo(tl, p, notes, 21.4, 0.8);
  clickAt(tl, p, notes, 22.25);
  flip(tl, k(root, 'file-notes'), 'frow in', 22.3, 'frow in sel');

  tl.set(tabFix, { attr: { class: 'fw-tab' } }, 22.4);
  flip(tl, tabNotes, 'fw-tab hide', 22.4, 'fw-tab on');
  tl.fromTo(
    tabNotes,
    { width: 0, paddingLeft: 0, paddingRight: 0 },
    { width: tabNotesWidth, paddingLeft: 12, paddingRight: 14, duration: 0.35, ease: 'power2.out', immediateRender: false },
    22.4,
  );
  tl.to(k(root, 'crumb-fix'), { autoAlpha: 0, duration: 0.15 }, 22.4);
  show(tl, k(root, 'crumb-notes'), 22.45, 0.2);
  tl.to(k(root, 'view-fix'), { autoAlpha: 0, duration: 0.2 }, 22.45);
  show(tl, k(root, 'view-notes'), 22.5, 0.2);
  lines(tl, ks(root, 'doc'), 22.7, 0.32);
  moveTo(tl, p, park, 23.0, 1.0);
  tl.to(p.cursor, { autoAlpha: 0, duration: 0.3 }, 23.8);

  // 29: fade, and the loop starts over
  tl.to(win, { opacity: 0, duration: 0.7, ease: 'power1.in' }, 29.1);
  tl.set({}, {}, 30);
  return tl;
};
