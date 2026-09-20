import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function resolveJavaBin() {
  const probe = spawnSync('java', ['-version'], { stdio: 'ignore' });
  if (!probe.error && probe.status === 0) return null;
  const root = 'C:\\Program Files\\Eclipse Adoptium';
  if (!existsSync(root)) throw new Error('Java 21 est requis pour tester la restauration Firebase.');
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(root, entry.name, 'bin'))
    .filter((directory) => existsSync(join(directory, 'java.exe')))
    .sort()
    .reverse()[0];
}

const environment = { ...process.env };
const pathKey = Object.keys(environment).find((key) => key.toLowerCase() === 'path') || 'PATH';
const javaBin = resolveJavaBin();
if (javaBin) environment[pathKey] = `${javaBin};${environment[pathKey] || ''}`;

const firebaseCli = join(process.cwd(), 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js');
const result = spawnSync(process.execPath, [
  firebaseCli,
  'emulators:exec',
  '--only',
  'firestore',
  '--project',
  'demo-storehub-backup',
  'npx tsx scripts/emulator-backup-roundtrip.ts',
], {
  cwd: process.cwd(),
  env: environment,
  stdio: 'inherit',
});

if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`La validation Firebase a échoué avec le code ${result.status}.`);
console.log('Sauvegarde logique et restauration Firestore isolée validées.');
