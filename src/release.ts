/* Whether Floti counts as released: true once Floti's release job has put
 * update.json at the repository root, or as FLOTI_RELEASED forces it.
 * astro.config.mjs decides it once per build (scripts/release-state.mjs) and
 * hands it in through Vite's define; this module is the only reader. While it
 * is false, the install guide shows its not-released notice and every
 * install box marks its commands as not live yet. */

declare const __FLOTI_RELEASED__: boolean;

export const released: boolean = __FLOTI_RELEASED__;
