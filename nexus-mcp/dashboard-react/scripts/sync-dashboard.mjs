import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(project, 'dist');
const dashboard = resolve(project, '../dashboard');
const assets = resolve(dashboard, 'assets');
if (!existsSync(resolve(output, 'index.html'))) throw new Error('Build the dashboard before synchronizing it.');
if (!assets.startsWith(dashboard + sep)) throw new Error('Invalid asset path.');
mkdirSync(dashboard, { recursive: true });
// Remove only generated bundles; leave any user-created dashboard files intact.
if (existsSync(assets)) for (const name of readdirSync(assets)) {
  if (/^[\w.-]+-[\w-]+\.(js|css|map)$/.test(name)) rmSync(resolve(assets, name));
}
cpSync(output, dashboard, { recursive: true });
console.log('Dashboard production files synchronized.');
