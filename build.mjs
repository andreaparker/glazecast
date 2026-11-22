#!/usr/bin/env node
/* Inline every source script into one portable HTML file. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const tags = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)];
if (!tags.length) throw new Error('no script tags found');

for (const [tag, src] of tags) {
  const code = fs.readFileSync(path.join(root, src), 'utf8');
  if (code.includes('</script')) throw new Error('script terminator inside ' + src);
  html = html.replace(tag, '<script>\n' + code + '\n</script>');
}

const out = path.join(root, 'dist', 'glazecast.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('wrote ' + path.relative(root, out) + '  (' + (html.length / 1024).toFixed(0) + ' kB, ' + tags.length + ' modules inlined)');
