/* What every page runs: the Gold/Sky switch and the install boxes. */

const PALETTE_KEY = 'floti-palette';
type Palette = 'gold' | 'sky';

function isPalette(value: unknown): value is Palette {
  return value === 'gold' || value === 'sky';
}

/** Gold or Sky for the whole page, remembered for the visitor. The head
 * script has already applied a saved choice before the first paint. The
 * tab's icon swaps with it: the matching icon link is turned on and moved
 * last, which makes browsers read the icon again. */
export function initPalette(): void {
  const root = document.documentElement;
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-palette-set]');
  const icons = Array.from(document.querySelectorAll<HTMLLinkElement>('link[data-palette-icon]'));
  const apply = (palette: Palette) => {
    root.dataset.palette = palette;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.paletteSet === palette)));
    for (const icon of icons) {
      const on = icon.dataset.paletteIcon === palette;
      icon.media = on ? 'all' : 'not all';
      if (on && icon !== document.head.lastElementChild) document.head.append(icon);
    }
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
export function initInstall(): void {
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
      // the wording is copy.yaml's, carried on the button
      const say = copy.dataset;
      let message: string;
      try {
        await navigator.clipboard.writeText(line.textContent ?? '');
        copy.textContent = say.labelCopied ?? '';
        message = say.statusCopied ?? '';
      } catch {
        // no clipboard access: select the command so it can be copied by hand
        const range = document.createRange();
        range.selectNodeContents(line);
        const selection = getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        copy.textContent = say.labelSelected ?? '';
        message = say.statusSelected ?? '';
      }
      copy.dataset.copied = '';
      if (status) status.textContent = message;
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        copy.textContent = say.labelCopy ?? '';
        delete copy.dataset.copied;
      }, 1800);
    });
  });
}
