/* The page's one script: the palette toggle, the install boxes, the typed
 * wordmark, the background parallax and the demos. */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { fitStages, initDemos } from './demo-runtime';

gsap.registerPlugin(ScrollTrigger);

const PALETTE_KEY = 'floti-palette';
type Palette = 'gold' | 'sky';

function isPalette(value: unknown): value is Palette {
  return value === 'gold' || value === 'sky';
}

/** Gold or Sky for the whole page, remembered for the visitor. The head
 * script has already applied a saved choice before the first paint. */
function initPalette(): void {
  const root = document.documentElement;
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-palette-set]');
  const apply = (palette: Palette) => {
    root.dataset.palette = palette;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.paletteSet === palette)));
  };
  apply(isPalette(root.dataset.palette) ? root.dataset.palette : 'gold');
  buttons.forEach((button) =>
    button.addEventListener('click', () => {
      const palette = button.dataset.paletteSet;
      if (!isPalette(palette)) return;
      apply(palette);
      try {
        localStorage.setItem(PALETTE_KEY, palette);
      } catch {
        // storage can be blocked; the choice then lasts for this page view
      }
    }),
  );
}

function onWindows(): boolean {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform || navigator.platform || navigator.userAgent;
  return /win/i.test(platform);
}

/** Picks the visitor's system and runs the copy button. */
function initInstall(): void {
  const windows = onWindows();
  document.querySelectorAll<HTMLElement>('[data-install]').forEach((box) => {
    const radio = box.querySelector<HTMLInputElement>(`input[value="${windows ? 'windows' : 'unix'}"]`);
    if (radio) radio.checked = true;

    const copy = box.querySelector<HTMLButtonElement>('[data-copy]');
    const status = box.querySelector<HTMLElement>('[data-copy-status]');
    if (!copy) return;
    let timer = 0;
    copy.addEventListener('click', async () => {
      const os = box.querySelector<HTMLInputElement>('input:checked')?.value ?? 'unix';
      const line = box.querySelector<HTMLElement>(`.install-line[data-os="${os}"] [data-cmd]`);
      if (!line) return;
      let message: string;
      try {
        await navigator.clipboard.writeText(line.textContent ?? '');
        copy.textContent = 'Copied';
        message = 'Install command copied.';
      } catch {
        // no clipboard access: select the command so it can be copied by hand
        const range = document.createRange();
        range.selectNodeContents(line);
        const selection = getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        copy.textContent = 'Selected';
        message = 'Install command selected. Copy it with your keyboard.';
      }
      copy.dataset.copied = '';
      if (status) status.textContent = message;
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        copy.textContent = 'Copy';
        delete copy.dataset.copied;
      }, 1800);
    });
  });
}

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
 * over the whole scroll. The hero's ship rocks on a timer while in view. */
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

initPalette();
initInstall();
fitStages();
if (!reduced) {
  typeWordmark();
  initParallax();
}
// demos measure text, so they wait for the fonts
document.fonts.ready.then(() => {
  initDemos(reduced);
  ScrollTrigger.refresh();
});
