/* What every page runs: the install boxes. */

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
