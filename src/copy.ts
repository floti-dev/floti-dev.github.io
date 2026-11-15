/* The page's wording, read from copy.yaml at the repository root.
 *
 * SHAPE lists every entry the page uses. Each is checked at build time: a
 * missing or empty entry stops the build with a message naming it, and an
 * entry the page does not use is reported, since it is most likely a typo.
 * `released` is the one switch that is not wording: true or false. */
import { parse } from 'yaml';
import source from '../copy.yaml?raw';

const TEXT = 'text';
const LIST = 'list';
const YESNO = 'yesno';

const SHAPE = {
  released: YESNO,
  page: { title: TEXT, description: TEXT },
  nav: { home: TEXT, install: TEXT, github: TEXT, palette: TEXT, gold: TEXT, sky: TEXT },
  hero: { headline: TEXT },
  install_box: {
    system: TEXT,
    unix: TEXT,
    windows: TEXT,
    copy: TEXT,
    copied: TEXT,
    selected: TEXT,
    copied_status: TEXT,
    selected_status: TEXT,
    not_live: TEXT,
  },
  guide: { label: TEXT, contents: TEXT },
  sections: {
    composition: { label: TEXT, headline: TEXT, lede: TEXT },
    fleet: { label: TEXT, headline: TEXT, lede: TEXT },
    plugins: { label: TEXT, headline: TEXT, lede: TEXT },
    browser: { label: TEXT, headline: TEXT, lede: TEXT },
    persistence: { label: TEXT, headline: TEXT, lede: TEXT },
    install: { label: TEXT, headline: TEXT, lede: TEXT, guide_link: TEXT, github_link: TEXT },
  },
  demos: {
    buttons: { replay: TEXT, pause: TEXT, play: TEXT },
    fleet: {
      states: { working: TEXT, needs_you: TEXT, done: TEXT, turn_ended: TEXT, stopped: TEXT },
      needs_you_count: TEXT,
      hint: TEXT,
      hint_touch: TEXT,
      answer: TEXT,
      answered_by_you: TEXT,
      answered_by_demo: TEXT,
    },
    persistence: {
      buttons: { close: TEXT, crash: TEXT, update: TEXT, open: TEXT },
      host: TEXT,
      closed: TEXT,
      crashed: TEXT,
      updating: TEXT,
      updated: TEXT,
      away: TEXT,
    },
    descriptions: {
      hero: TEXT,
      composition: TEXT,
      fleet: TEXT,
      plugins: TEXT,
      browser: TEXT,
      persistence: TEXT,
    },
  },
  footer: { line: TEXT, license: TEXT },
} as const;

type Shape = { readonly [key: string]: typeof TEXT | typeof LIST | typeof YESNO | Shape };
type Read<S> = S extends typeof TEXT
  ? string
  : S extends typeof LIST
    ? string[]
    : S extends typeof YESNO
      ? boolean
      : { [K in keyof S]: Read<S[K]> };
export type Copy = Read<typeof SHAPE>;

class CopyError extends Error {
  constructor(message: string) {
    super(`copy.yaml: ${message}`);
    this.name = 'CopyError';
  }
}

function missing(path: string): never {
  throw new CopyError(`"${path}" is missing or empty. Add it to copy.yaml at the root of the repository.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function read(shape: Shape, value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) return missing(path || 'the whole file');
  const out: Record<string, unknown> = {};
  for (const [key, kind] of Object.entries(shape)) {
    const here = path ? `${path}.${key}` : key;
    const entry = value[key];
    if (kind === TEXT) {
      if (typeof entry !== 'string' || entry.trim() === '') missing(here);
      out[key] = entry.trim();
    } else if (kind === YESNO) {
      if (typeof entry !== 'boolean') {
        throw new CopyError(`"${here}" must be true or false.`);
      }
      out[key] = entry;
    } else if (kind === LIST) {
      if (!Array.isArray(entry) || entry.length === 0) missing(here);
      out[key] = entry.map((item, i) => {
        if (typeof item !== 'string' || item.trim() === '') missing(`${here}[${i}]`);
        return item.trim();
      });
    } else {
      out[key] = read(kind, entry, here);
    }
  }
  for (const key of Object.keys(value)) {
    if (!(key in shape)) console.warn(`copy.yaml: "${path ? `${path}.` : ''}${key}" is not used by the page.`);
  }
  return out;
}

function load(): Copy {
  let data: unknown;
  try {
    data = parse(source);
  } catch (error) {
    throw new CopyError(`it could not be read as YAML: ${(error as Error).message}`);
  }
  return read(SHAPE, data, '') as Copy;
}

export const copy: Copy = load();
