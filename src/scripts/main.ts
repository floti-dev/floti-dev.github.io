/* The home page's script: the install boxes (from site.ts, shared with the
 * install guide), the typed wordmark, the background
 * parallax and the demos. */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { fitStages, initDemos } from './demo-runtime';
import { initInstall } from './site';

gsap.registerPlugin(ScrollTrigger);

/** floti_ types itself once, the underscore riding after the last letter.
 * The whole word is in the markup, so the page reads before this runs. */
function typeWordmark(): void {
  const svg = document.querySelector<SVGSVGElement>('.hero-word svg');
  const cursor = svg?.querySelector<SVGGraphicsElement>('.hi');
  const letters = svg ? Array.from(svg.querySelectorAll<SVGGraphicsElement>('.word')) : [];
  if (!svg || !cursor || letters.length === 0) return;

  const home = cursor.getBBox().x;
  const gap = home - (letters.at(-1)!.getBBox().x + letters.at(-1)!.getBBox().width);
  const after = (n: number) => (n === 0 ? 0 : letters[n - 1].getBBox().x + letters[n - 1].getBBox().width + gap) - home;
  const place = (n: number) => {
    letters.forEach((l, i) => l.setAttribute('visibility', i < n ? 'visible' : 'hidden'));
    cursor.setAttribute('transform', `translate(${after(n)} 0)`);
  };

  place(0);
  let n = 0;
  const tick = () => {
    n += 1;
    place(n);
    if (n < letters.length) window.setTimeout(tick, 150);
    else cursor.removeAttribute('transform');
  };
  window.setTimeout(tick, 380);
}

/** Background layers drift slower than the page, each by its own depth.
 * Each layer is made just tall enough that its items cross the screen once
 * over the whole scroll. The hero's ship rocks on a timer while in view.
 * A phone shows two of the three layers (global.css). */
function initParallax(): void {
  const layers = Array.from(document.querySelectorAll<HTMLElement>('.px-layer[data-depth]'));
  const size = () => {
    const travel = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    layers.forEach((layer) => {
      const depth = Number(layer.dataset.depth);
      layer.style.height = `${(1 - depth) * travel + window.innerHeight}px`;
      layer.style.bottom = 'auto';
    });
  };
  ScrollTrigger.addEventListener('refreshInit', size);
  size();
  layers.forEach((layer) => {
    const depth = Number(layer.dataset.depth);
    gsap.fromTo(
      layer,
      { y: 0 },
      {
        y: () => ScrollTrigger.maxScroll(window) * depth,
        ease: 'none',
        scrollTrigger: { start: 0, end: 'max', scrub: true, invalidateOnRefresh: true },
      },
    );
  });

  const ship = document.querySelector<HTMLElement>('.hero-ship');
  const rock = document.querySelector<HTMLElement>('.hero-ship-rock');
  if (!ship || !rock) return;
  gsap.to(ship, {
    y: () => window.innerHeight * 0.3,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
  });
  const rocking = gsap.fromTo(rock, { rotation: -2.4 }, { rotation: 2.4, duration: 5.5, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => (self.isActive ? rocking.resume() : rocking.pause()),
  });
}

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** The visitor asked their browser to save data: the background stays still. */
const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;

initInstall();
fitStages();
if (!reduced) typeWordmark();
if (!reduced && !saveData) initParallax();
// demos measure text, so they wait for the fonts
document.fonts.ready.then(() => {
  initDemos(reduced);
  ScrollTrigger.refresh();
});
