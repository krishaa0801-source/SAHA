import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [path.join(here, 'src/index.jsx')],
  bundle: true,
  outfile: path.join(here, '../public/vault-react.bundle.js'),
  format: 'iife',
  target: ['es2019'],
  jsx: 'automatic',
  minify: true,
  logLevel: 'info',
});

console.log('Built public/vault-react.bundle.js');
