/* Sessions outlive the window: it closes, the fleet sails on, it reopens. */
import { gsap } from 'gsap';
import { k, ks, lines, type Builder } from './kit';

export const persist: Builder = (root) => {
  const tl = gsap.timeline({ paused: true });
  const win = k(root, 'win');
  const closed = k(root, 'closed');
  const hulls = ks(root, 'hull');
  const turns = ks(root, 'turn');
  const total = 9.5;

  // the fleet rides the swell for the whole demo
  tl.fromTo(k(root, 'wave'), { x: 0 }, { x: -150, duration: total, ease: 'none' }, 0);
  hulls.forEach((hull, i) => {
    const swing = 0.7 + i * 0.09;
    // an odd number of repeats brings each hull back to level at the end
    const repeat = Math.floor(total / swing) | 1;
    tl.fromTo(hull, { y: 0, rotation: 0 }, { y: -4, rotation: 2, duration: swing, ease: 'sine.inOut', yoyo: true, repeat }, i * 0.2);
  });

  // the window opens on three tabs, then closes
  tl.to(win, { scale: 0.92, y: 18, autoAlpha: 0, duration: 0.55, ease: 'power2.in' }, 1.2);
  tl.fromTo(closed, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 1.9);

  // the host keeps every session working: turns keep counting
  turns.forEach((el) => {
    const from = Number(el.dataset.from);
    const to = Number(el.dataset.to);
    const count = { n: from };
    const write = (n: number) => {
      el.textContent = String(Math.round(n));
    };
    // the start frame, now and on every replay
    write(from);
    tl.call(write, [from], 0);
    tl.fromTo(
      count,
      { n: from },
      {
        n: to,
        duration: 3.6,
        ease: `steps(${to - from})`,
        onUpdate: () => write(count.n),
      },
      2.1,
    );
  });

  // it opens again, on the same tabs, with the work done meanwhile
  tl.to(closed, { autoAlpha: 0, duration: 0.25 }, 6.0);
  tl.to(win, { scale: 1, y: 0, autoAlpha: 1, duration: 0.55, ease: 'power3.out' }, 6.3);
  lines(tl, ks(root, 'away'), 7.0, 0.35);
  return tl;
};
