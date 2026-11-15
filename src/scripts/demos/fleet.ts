/* Agents that run agents, on every machine: the lead starts helpers here, on
 * build-box and on the laptop, each appearing under its machine in the
 * sidebar; tester starts one of its own, the visitor answers tester, reports
 * come home along the tethers. */
import { gsap } from 'gsap';
import { flip, k, ks, stageOf, textOf, type Builder, type Timeline } from './kit';

type Key = 'scout' | 'tester' | 'fixture' | 'docs';
type State = 'working' | 'need' | 'done' | 'turn_ended';

interface Helper {
  key: Key;
  depth: 1 | 2;
  end: 'done' | 'turn_ended';
  pane: HTMLElement;
  head: HTMLElement;
  body: HTMLElement;
  chip: HTMLElement;
  timer: HTMLElement;
  tether: SVGPathElement;
  report: HTMLElement;
  row: HTMLElement;
  rowDot: HTMLElement;
  word: HTMLElement;
  /** Where its tether starts: a line in the lead's (or tester's) terminal. */
  from: HTMLElement;
  seconds: number;
  /** The open pane's height and width, and its body's height. */
  paneH: number;
  paneW: number;
  bodyH: number;
  /** The folded chip's width. */
  foldW: number;
  baseClass: string;
}

const GROW = 0.45;
const AUTO_ANSWER = 4.5;

/** A line that takes no room until it arrives, so a terminal's newest line
 * sits at its foot and older ones scroll off the top. */
function stream(tl: Timeline, els: HTMLElement[], at: number, gap = 0.5): void {
  els.forEach((el, i) => {
    tl.fromTo(el, { display: 'none', opacity: 0 }, { display: 'block', opacity: 1, duration: 0.18, ease: 'power1.out' }, at + i * gap);
  });
}

/** A command typed out character by character. */
function type(tl: Timeline, el: HTMLElement, at: number, cps = 34): number {
  const n = Math.max(1, (el.textContent ?? '').length);
  const duration = n / cps;
  tl.fromTo(
    el,
    { display: 'none', clipPath: 'inset(0 100% 0 0)' },
    { display: 'block', clipPath: 'inset(0 0% 0 0)', duration, ease: `steps(${n})` },
    at,
  );
  return at + duration;
}

function clock(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const fleet: Builder = (root, ctx) => {
  const text = textOf(root);
  const stage = stageOf(root);
  const fam = k(root, 'fam');
  const lead = k(root, 'lead');
  const status = k(root, 'st-work');
  const note = k(root, 'answer-note');
  const testerPane = k(root, 'hp-tester');
  const tl = gsap.timeline({ paused: true });

  const helpers: Helper[] = (['scout', 'tester', 'fixture', 'docs'] as const).map((key) => {
    const pane = k(root, `hp-${key}`);
    const body = k(root, `body-${key}`);
    const depth = pane.classList.contains('d2') ? 2 : 1;
    const baseClass = `hp d${depth}`;
    // the folded chip is the drawing at rest; open it to measure the pane
    const foldW = pane.offsetWidth;
    pane.className = baseClass;
    const paneH = pane.offsetHeight;
    const paneW = pane.offsetWidth;
    const bodyH = body.offsetHeight;
    pane.className = `${baseClass} folded`;
    const timer = k(root, `timer-${key}`);
    const [m, s] = (timer.textContent ?? '0:00').trim().split(':').map(Number);
    return {
      key,
      depth,
      end: key === 'docs' ? 'turn_ended' : 'done',
      pane,
      head: pane.querySelector<HTMLElement>('.hp-head')!,
      body,
      chip: k(root, `chip-${key}`),
      timer,
      tether: k(root, `tether-${key}`) as unknown as SVGPathElement,
      report: k(root, `report-${key}`),
      row: k(root, `row-${key}`),
      rowDot: k(root, `rowdot-${key}`),
      word: k(root, `word-${key}`),
      from: depth === 2 ? k(root, 'tester-start') : k(root, `lead-start-${key}`),
      seconds: m * 60 + s,
      paneH,
      paneW,
      bodyH,
      foldW,
      baseClass,
    };
  });
  const by = Object.fromEntries(helpers.map((h) => [h.key, h])) as Record<Key, Helper>;

  // ---- geometry: tethers are redrawn from the panes' live positions

  const box = (el: Element) => {
    const r = el.getBoundingClientRect();
    const f = fam.getBoundingClientRect();
    const scale = stage.getBoundingClientRect().width / stage.offsetWidth || 1;
    return { l: (r.left - f.left) / scale, t: (r.top - f.top) / scale, r: (r.right - f.left) / scale, b: (r.bottom - f.top) / scale };
  };

  const draw = () => {
    for (const h of helpers) {
      const anchor = box(h.depth === 2 ? testerPane : lead);
      const head = box(h.head);
      const hy = (head.t + head.b) / 2;
      if (head.l > anchor.r) {
        // beside its parent: a curve from the line that started it
        const line = h.from.offsetParent ? box(h.from) : head;
        const ay = Math.min(Math.max((line.t + line.b) / 2, anchor.t + 40), anchor.b - 12);
        const dx = (head.l - anchor.r) / 2;
        h.tether.setAttribute('d', `M${anchor.r} ${ay}C${anchor.r + dx} ${ay} ${head.l - dx} ${hy} ${head.l} ${hy}`);
      } else {
        // below its parent: down its left side, then in
        const ax = anchor.l + 12;
        h.tether.setAttribute('d', `M${ax} ${anchor.b}V${hy}H${head.l}`);
      }
    }
  };
  tl.eventCallback('onUpdate', draw);

  // ---- states: the chip, the sidebar row and the status bar agree

  let working = 1;
  const setWorking = (n: number) => {
    working = n;
    status.textContent = `${n} ${text.working}`;
  };
  const setState = (h: Helper, state: State, folded = false) => {
    const word = state === 'need' ? text.needs_you : text[state];
    h.chip.textContent = folded ? `${text.stopped} · ${word}` : word;
    h.chip.className = `chip ${state === 'need' ? 'need' : state === 'working' ? 'work' : 'end'}`;
    h.word.textContent = word;
    h.word.className = `word${state === 'need' ? ' need' : ''}`;
    h.rowDot.className = `dot${state === 'need' ? ' need' : state === 'working' ? '' : ' idle'}`;
  };

  // ---- waiting for the visitor to answer tester

  let auto: gsap.core.Tween | null = null;
  const waiting = () => root.dataset.waiting !== undefined;
  const arm = () => {
    auto?.kill();
    auto = ctx.visible() ? gsap.delayedCall(AUTO_ANSWER, () => answer(false)) : null;
  };
  const answer = (byYou: boolean) => {
    if (!waiting()) return;
    auto?.kill();
    auto = null;
    delete root.dataset.waiting;
    note.textContent = `(${byYou ? text.answered_by_you : text.answered_by_demo})`;
    if (ctx.visible()) tl.resume();
  };
  ctx.onVisibility((on) => {
    if (!waiting()) return;
    if (on) arm();
    else auto?.kill();
  });
  for (const el of [by.tester.chip, k(root, 'st-need'), k(root, 'answer')]) {
    el.addEventListener('click', () => answer(true));
  }

  // ---- the start frame

  const reset = () => {
    auto?.kill();
    delete root.dataset.waiting;
    setWorking(1);
    for (const h of helpers) {
      setState(h, 'working');
      h.timer.textContent = '0:00';
    }
    note.textContent = '';
  };

  // ---- the timeline

  const leadW = lead.offsetWidth;
  const famW = fam.offsetWidth;
  // the folded chips, at rest, as a little tree: centred in the column at the
  // end so the final frame has no empty well beneath them
  const col = k(root, 'col');
  const last = col.lastElementChild as HTMLElement;
  const settle = Math.max(0, (col.offsetHeight - (last.offsetTop + last.offsetHeight)) / 2);
  const beside = leadW < famW - 8;

  const spawn = (h: Helper, at: number) => {
    tl.fromTo(h.pane, { height: 0, visibility: 'hidden' }, { height: h.paneH, visibility: 'visible', duration: GROW, ease: 'power3.out' }, at);
    tl.set(h.pane, { height: 'auto' }, at + GROW);
    tl.fromTo(h.tether, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out' }, at);
    tl.fromTo(h.row, { height: 0, autoAlpha: 0 }, { height: 26, autoAlpha: 1, duration: 0.35, ease: 'power2.out' }, at + 0.1);
    tl.call(() => setWorking(working + 1), [], at);
  };

  const run = (h: Helper, from: number, to: number) => {
    const t = { s: 0 };
    tl.fromTo(
      t,
      { s: 0 },
      { s: h.seconds, duration: to - from, ease: 'none', onUpdate: () => (h.timer.textContent = clock(t.s)) },
      from,
    );
  };

  /** A helper finishes: its report rides its tether home and lands as a line,
   * its pane folds into a stopped chip and its tether fades. */
  const finish = (h: Helper, at: number, lands: HTMLElement) => {
    tl.call(() => setState(h, h.end), [], at);
    const ride = { t: 0 };
    tl.fromTo(h.report, { autoAlpha: 0, xPercent: -50, yPercent: -50, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.2 }, at + 0.15);
    tl.fromTo(
      ride,
      { t: 0 },
      {
        t: 1,
        duration: 0.8,
        ease: 'power2.inOut',
        immediateRender: false,
        onUpdate: () => {
          if (!h.tether.getAttribute('d')) return;
          const p = h.tether.getPointAtLength(h.tether.getTotalLength() * (1 - ride.t));
          gsap.set(h.report, { x: p.x, y: p.y });
        },
      },
      at + 0.2,
    );
    tl.to(h.report, { autoAlpha: 0, duration: 0.15 }, at + 1.0);
    stream(tl, [lands], at + 1.0);
    flip(tl, lands, 'ln', at + 1.0, 'ln landed');
    tl.fromTo(h.body, { height: h.bodyH }, { height: 0, duration: 0.4, ease: 'power2.inOut', immediateRender: false }, at + 1.2);
    tl.fromTo(h.pane, { width: h.paneW }, { width: h.foldW, duration: 0.4, ease: 'power2.inOut', immediateRender: false }, at + 1.2);
    flip(tl, h.pane, h.baseClass, at + 1.6, `${h.baseClass} folded`);
    // the chip settles to exactly its own width
    tl.set(h.pane, { width: 'auto' }, at + 1.6);
    flip(tl, h.tether as unknown as HTMLElement, 'tether', at + 1.2, 'tether faded');
    tl.call(() => {
      setState(h, h.end, true);
      setWorking(working - 1);
    }, [], at + 1.6);
  };

  tl.call(reset, [], 0);

  // the lead is asked, and starts its helpers one by one
  type(tl, k(root, 'lead-prompt'), 0.3);
  stream(tl, [k(root, 'lead-think')], 1.8);
  let at = type(tl, k(root, 'lead-start-scout'), 2.4) + 0.1;
  if (beside) tl.fromTo(lead, { width: famW }, { width: leadW, duration: 0.55, ease: 'power3.inOut' }, at - 0.15);
  spawn(by.scout, at + 0.15);
  run(by.scout, at + 0.15, 6.6);
  at = type(tl, k(root, 'lead-start-tester'), 3.7) + 0.1;
  spawn(by.tester, at);
  run(by.tester, at, 13.6);
  at = type(tl, k(root, 'lead-start-docs'), 5.3) + 0.1;
  spawn(by.docs, at);
  run(by.docs, at, 10.4);

  // the helpers work in parallel, each at its own pace
  stream(tl, ks(root, 'ln-scout'), 3.7, 0.5);
  stream(tl, ks(root, 'ln-tester').slice(0, 3), 5.2, 0.8);
  stream(tl, ks(root, 'ln-docs'), 6.5, 0.95);
  stream(tl, [k(root, 'lead-work')], 8.6);

  // tester starts a helper of its own on build-box: the family is two deep
  at = type(tl, k(root, 'tester-start'), 7.3) + 0.1;
  flip(tl, by.tester.row, 'fw-row session grow', at, 'fw-row session grow parent');
  spawn(by.fixture, at);
  run(by.fixture, at, 9.9);
  stream(tl, ks(root, 'ln-fixture'), at + 0.4, 0.6);

  // reports come home, and finished panes fold away
  finish(by.scout, 6.6, k(root, 'lead-rep-scout'));
  finish(by.fixture, 9.9, k(root, 'tester-report'));
  finish(by.docs, 10.4, k(root, 'lead-rep-docs'));

  // tester needs you: the demo waits for an answer, or answers itself
  const lines = ks(root, 'ln-tester');
  stream(tl, [lines[3]], 11.2);
  stream(tl, [k(root, 'tester-ask')], 11.8);
  tl.call(() => setState(by.tester, 'need'), [], 12.0);
  flip(tl, testerPane, by.tester.baseClass, 12.0, `${by.tester.baseClass} ask`);
  tl.call(() => {
    root.dataset.waiting = '';
    tl.pause();
    arm();
  }, [], 12.2);
  tl.set(testerPane, { attr: { class: `${by.tester.baseClass} focus` } }, 12.3);
  tl.set(testerPane, { attr: { class: by.tester.baseClass } }, 13.0);
  tl.call(() => setState(by.tester, 'working'), [], 12.3);
  stream(tl, [k(root, 'tester-answer')], 12.35);
  stream(tl, [lines[4]], 13.2);
  finish(by.tester, 13.6, k(root, 'lead-rep-tester'));

  // the lead uses what came back
  stream(tl, [k(root, 'lead-final')], 15.4);
  tl.fromTo(col, { paddingTop: 0 }, { paddingTop: settle, duration: 0.9, ease: 'power2.inOut' }, 15.5);
  tl.set({}, {}, 16.6);

  if (ctx.reduced) {
    // the final frame stays until the visitor presses Play
    tl.progress(1, true);
    for (const h of helpers) {
      setState(h, h.end, true);
      h.timer.textContent = clock(h.seconds);
    }
  } else {
    reset();
  }
  requestAnimationFrame(draw);
  return tl;
};
