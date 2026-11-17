/* Sessions outlive the window: a live Floti window the visitor can close,
 * crash or update while the host keeps every session working.
 *
 * The window's sessions stream lines on a heartbeat that lives on the
 * demo's timeline, so the runtime pauses them off screen. On first view the
 * timeline closes Floti and opens it again by itself; once the visitor
 * presses a button, the buttons drive it. Under reduced motion the timeline
 * never runs and each button lands on its result at once. */
import { gsap } from 'gsap';
import { centre, k, stageOf, textOf, type Builder } from './kit';

type Line = [cls: string, text: string];
interface SessionData {
  key: string;
  name: string;
  turn: number;
  pool: Line[];
}
interface Session extends SessionData {
  next: number;
  lines: number;
  count: number;
  wait: number;
  every: number;
  x: number;
  term: HTMLElement;
  turnEl: HTMLElement;
  hostTurn: HTMLElement;
  hostLine: HTMLElement;
  ship: HTMLElement;
}

const TICK = 0.25; // seconds between heartbeats
const MINUTES_PER_SECOND = 28; // how fast time passes while Floti is closed
const SHOWN = 4; // lines each terminal starts with
const KEEP = 16; // lines a terminal keeps
const AWAY_INSTANT = 134; // minutes that pass at once under reduced motion

function since(minutes: number): string {
  const m = Math.round(minutes);
  return `+${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

export const persist: Builder = (root, ctx) => {
  const text = textOf(root);
  const stage = stageOf(root);
  const box = k(root, 'persist');
  const win = k(root, 'win');
  const host = k(root, 'host');
  const say = k(root, 'host-say');
  const clock = k(root, 'clock');
  const update = k(root, 'update');
  const updateText = k(root, 'update-text');
  const updateBar = k(root, 'update-bar');
  const versionEl = k(root, 'version');
  const updated = k(root, 'updated');
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-act]'));
  const instant = ctx.reduced;

  const data = JSON.parse(box.dataset.sessions ?? '[]') as SessionData[];
  const sessions: Session[] = data.map((d, i) => ({
    ...d,
    next: SHOWN,
    lines: 0,
    count: d.turn,
    wait: 0,
    every: 1.1 + i * 0.35,
    x: i * 0.13,
    term: k(root, `term-${d.key}`),
    turnEl: k(root, `turn-${d.key}`),
    hostTurn: k(root, `hturn-${d.key}`),
    hostLine: k(root, `hline-${d.key}`),
    ship: k(root, `ship-${d.key}`),
  }));

  // the window shrinks into the app icon and grows back out of it; measured
  // each time it goes, while it still stands where it rests
  const app = k(root, 'app');
  let shrunk = { x: 0, y: 0, scale: 0.05, autoAlpha: 0 };
  const measure = () => {
    const winAt = centre(win, stage);
    const appAt = centre(app, stage);
    shrunk = { x: appAt.x - winAt.x, y: appAt.y - winAt.y, scale: 0.05, autoAlpha: 0 };
  };
  measure();
  /** False once the demo is torn down to be built again: a sequence still
   * under way stops where it is. */
  const alive = () => !ctx.signal.aborted;

  let mode: 'open' | 'closed' = 'open';
  let busy = false;
  let away = 0;
  let minor = 1;
  let driven = false;

  // ---- drawing

  const setMode = (next: 'open' | 'closed') => {
    mode = next;
    root.dataset.state = next;
    box.dataset.mode = next;
  };
  const setBusy = (on: boolean) => {
    busy = on;
    buttons.forEach((b) => (b.disabled = on));
  };
  const lineEl = ([cls, line]: Line) => {
    const el = document.createElement('span');
    el.className = cls ? `ln t-${cls}` : 'ln';
    el.textContent = line;
    return el;
  };
  const setTurn = (s: Session, n: number) => {
    s.count = n;
    s.turnEl.textContent = `turn ${n}`;
    s.hostTurn.textContent = `turn ${n}`;
  };
  /** How far along its lane a ship is, 0 to 1; the styles place it, along
   * the lane on a desktop and down it on a phone. */
  const placeShip = (s: Session) => {
    s.ship.style.setProperty('--x', s.x.toFixed(4));
  };

  /** A session writes its next line; its turn count rises with its work. */
  const emit = (s: Session) => {
    const line = s.pool[s.next % s.pool.length];
    s.next += 1;
    s.lines += 1;
    s.term.append(lineEl(line));
    while (s.term.childElementCount > KEEP) s.term.firstElementChild?.remove();
    s.hostLine.textContent = line[1].trim();
    if (mode === 'closed' || s.lines % 2 === 0) setTurn(s, s.count + 1);
  };

  const clearMarks = () => {
    for (const s of sessions) {
      s.term.querySelectorAll('.away').forEach((el) => el.remove());
      s.term.querySelectorAll('.fresh').forEach((el) => el.classList.remove('fresh'));
    }
  };

  /** Floti goes: each terminal is marked where it left off. */
  const markAway = () => {
    clearMarks();
    for (const s of sessions) {
      const mark = document.createElement('span');
      mark.className = 'ln away';
      const label = document.createElement('span');
      label.textContent = text.away;
      const when = document.createElement('span');
      when.className = 'when';
      mark.append(label, when);
      s.term.append(mark);
    }
  };

  /** Floti is back: what came in meanwhile is lit for a moment. */
  const showAway = () => {
    for (const s of sessions) {
      const mark = s.term.querySelector('.away');
      if (!mark) continue;
      mark.querySelector('.when')!.textContent = since(away);
      let el = mark.nextElementSibling;
      while (el) {
        el.classList.add('fresh');
        el = el.nextElementSibling;
      }
    }
  };

  const pass = (minutes: number) => {
    away += minutes;
    clock.textContent = since(away);
  };

  /** Time passing at once: each session gets on with a couple of lines. */
  const passAtOnce = (minutes: number) => {
    pass(minutes);
    for (const s of sessions) {
      for (let i = 0; i < 2; i += 1) emit(s);
      setTurn(s, s.count + Math.round(minutes / 20));
    }
  };

  // ---- the heartbeat

  const tick = () => {
    for (const s of sessions) {
      s.wait += TICK;
      if (s.wait >= s.every) {
        s.wait = 0;
        emit(s);
      }
      if (mode === 'closed') {
        s.x = (s.x + 0.012) % 1;
        placeShip(s);
      }
    }
    if (mode === 'closed') pass(MINUTES_PER_SECOND * TICK);
  };

  // ---- what the buttons do

  const showHost = (message: string, animate: boolean) => {
    say.textContent = message;
    away = 0;
    clock.textContent = since(0);
    if (animate) gsap.fromTo(host, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' });
    else gsap.set(host, { autoAlpha: 1, y: 0 });
  };

  const close = (message = text.closed): Promise<void> => {
    setBusy(true);
    measure();
    markAway();
    setMode('closed');
    return new Promise((done) => {
      if (instant) {
        gsap.set(win, shrunk);
        showHost(message, false);
        passAtOnce(AWAY_INSTANT);
        setBusy(false);
        return done();
      }
      gsap.to(win, {
        ...shrunk,
        duration: 0.55,
        ease: 'power3.in',
        onComplete: () => {
          showHost(message, true);
          setBusy(false);
          done();
        },
      });
    });
  };

  const crash = () => {
    // no animation: the window is simply gone
    measure();
    markAway();
    setMode('closed');
    gsap.set(win, { autoAlpha: 0 });
    showHost(text.crashed, false);
    if (instant) passAtOnce(AWAY_INSTANT);
  };

  const open = (): Promise<void> => {
    setBusy(true);
    return new Promise((done) => {
      const finish = () => {
        setMode('open');
        showAway();
        setBusy(false);
        done();
      };
      if (instant) {
        gsap.set(host, { autoAlpha: 0 });
        gsap.set(win, { x: 0, y: 0, scale: 1, autoAlpha: 1 });
        return finish();
      }
      gsap.to(host, { autoAlpha: 0, duration: 0.2 });
      gsap.fromTo(win, shrunk, { x: 0, y: 0, scale: 1, autoAlpha: 1, duration: 0.55, ease: 'power3.out', delay: 0.15, onComplete: finish });
    });
  };

  const upgrade = async () => {
    minor += 1;
    const version = `3.${minor}.0`;
    updateText.textContent = `${text.updating} ${version}`;
    if (instant) {
      await close(text.updating);
      say.textContent = text.updated;
      versionEl.textContent = `Floti ${version}`;
      gsap.set(updated, { display: 'inline-block', autoAlpha: 1 });
      await open();
      return;
    }
    setBusy(true);
    gsap.set(update, { xPercent: -50, yPercent: -50 });
    await gsap
      .timeline()
      .fromTo(update, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.25 })
      .fromTo(updateBar, { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: 'power1.inOut' })
      .to(update, { autoAlpha: 0, duration: 0.2 }, '+=0.15')
      .then();
    if (!alive()) return;
    await close(text.updating);
    setBusy(true);
    await gsap.delayedCall(1.4, () => {}).then();
    if (!alive()) return;
    versionEl.textContent = `Floti ${version}`;
    say.textContent = text.updated;
    await gsap.delayedCall(0.7, () => {}).then();
    if (!alive()) return;
    await open();
    gsap.fromTo(updated, { display: 'inline-block', autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 });
    gsap.to(updated, { autoAlpha: 0, duration: 0.4, delay: 4, onComplete: () => void gsap.set(updated, { display: 'none' }) });
  };

  const act = (name: string) => {
    if (busy) return;
    driven = true;
    if (name === 'close' && mode === 'open') void close();
    else if (name === 'crash' && mode === 'open') crash();
    else if (name === 'update' && mode === 'open') void upgrade();
    else if (name === 'open' && mode === 'closed') void open();
  };
  buttons.forEach((b) => b.addEventListener('click', () => act(b.dataset.act ?? ''), { signal: ctx.signal }));

  // ---- the start frame and the first sequence

  const reset = () => {
    gsap.killTweensOf([win, host, update, updateBar, updated]);
    driven = false;
    away = 0;
    minor = 1;
    versionEl.textContent = 'Floti 3.1.0';
    gsap.set(updated, { autoAlpha: 0, display: 'none' });
    gsap.set(update, { autoAlpha: 0 });
    gsap.set(host, { autoAlpha: 0 });
    gsap.set(win, { x: 0, y: 0, scale: 1, autoAlpha: 1 });
    for (const s of sessions) {
      s.term.replaceChildren(...s.pool.slice(0, SHOWN).map(lineEl));
      s.next = SHOWN;
      s.lines = 0;
      s.wait = 0;
      setTurn(s, s.turn);
      placeShip(s);
    }
    setMode('open');
    setBusy(false);
  };

  const tl = gsap.timeline({ paused: true });
  const beat = { n: 0 };
  tl.call(reset, [], 0);
  tl.to(beat, { n: 1, duration: TICK, repeat: -1, ease: 'none', onRepeat: tick }, 0);
  tl.call(() => {
    if (!driven && mode === 'open' && !busy) void close();
  }, [], 2.6);
  tl.call(() => {
    if (!driven && mode === 'closed' && !busy) void open();
  }, [], 7.6);

  // torn down to be built again: Floti stands open, its controls free
  ctx.signal.addEventListener('abort', () => {
    gsap.killTweensOf([win, host, update, updateBar, updated]);
    gsap.set(win, { x: 0, y: 0, scale: 1, autoAlpha: 1 });
    gsap.set(host, { autoAlpha: 0 });
    gsap.set(update, { autoAlpha: 0 });
    setMode('open');
    setBusy(false);
  });

  setMode('open');
  if (!instant) reset();
  sessions.forEach(placeShip);
  return tl;
};
