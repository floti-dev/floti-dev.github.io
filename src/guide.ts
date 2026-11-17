/* The install guide's prose, read from install.md at the repository root.
 *
 * Its frontmatter holds the top of the page (title, lede, notice) and the
 * page's description; each is checked at build time, so a missing or empty
 * entry stops the build with a message naming it. The Markdown after it is
 * the guide, rendered by Astro; its "## " headings are the sections the page
 * lists under the install box. */
import * as source from '../install.md';

const FIELDS = ['title', 'description', 'lede', 'notice'] as const;

type Field = (typeof FIELDS)[number];
export type GuideTop = Record<Field, string>;

function readTop(frontmatter: Record<string, unknown>): GuideTop {
  const top = {} as GuideTop;
  for (const field of FIELDS) {
    const value = frontmatter[field];
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`install.md: "${field}" is missing or empty in the block between the --- lines at the top.`);
    }
    top[field] = value.trim();
  }
  for (const key of Object.keys(frontmatter)) {
    if (!(FIELDS as readonly string[]).includes(key)) console.warn(`install.md: "${key}" is not used by the page.`);
  }
  return top;
}

export const top: GuideTop = readTop(source.frontmatter);

/** The guide's body, as a component. */
export const Guide = source.Content;

/** The guide's sections, for the links under the install box. */
export const sections = source
  .getHeadings()
  .filter((heading) => heading.depth === 2)
  .map(({ slug, text }) => ({ slug, text }));
