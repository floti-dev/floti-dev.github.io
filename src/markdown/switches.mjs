// A Markdown plugin (for Sätteri, Astro's Markdown processor) that leaves out
// a section of a page while a switch in copy.yaml is off.
//
// A section is marked by a comment on the line before its "## " heading:
//
//   <!-- shown while package_managers is true in copy.yaml -->
//   ## Homebrew and winget
//
// The section runs from that heading to the next "## " heading or the end of
// the page. While the switch is false the comment and the section are
// removed, so the section's text and its link in the page's contents are gone
// from the build; while it is true only the comment is removed. A comment
// naming a switch that is not true or false in copy.yaml stops the build.

import { fileURLToPath } from 'node:url';

const MARK = /^<!--\s*shown while ([a-z_]+) is true in copy\.yaml\s*-->$/;

/**
 * @param {Record<string, unknown>} switches copy.yaml's top-level entries
 * @returns {import('satteri').MdastPluginEntry}
 */
export function switchesPlugin(switches) {
  return {
    name: 'floti-copy-switches',
    before(root, ctx) {
      const where = ctx.fileURL ? fileURLToPath(ctx.fileURL) : 'a Markdown page';
      const nodes = root.children;
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const mark = node.type === 'html' ? MARK.exec(node.value.trim()) : null;
        if (!mark) continue;
        const [, name] = mark;
        if (typeof switches[name] !== 'boolean') {
          throw new Error(`${where}: "${name}" in a "shown while" comment is not a true or false entry in copy.yaml.`);
        }
        const heading = nodes[i + 1];
        if (heading?.type !== 'heading' || heading.depth !== 2) {
          throw new Error(`${where}: the "shown while ${name}" comment must be on the line before a "## " heading.`);
        }
        ctx.removeNode(node);
        if (switches[name]) continue;
        // the section: its heading and everything up to the next "## "
        let end = i + 1;
        do {
          ctx.removeNode(nodes[end]);
          end++;
        } while (end < nodes.length && !(nodes[end].type === 'heading' && nodes[end].depth <= 2));
        i = end - 1;
      }
    },
  };
}
