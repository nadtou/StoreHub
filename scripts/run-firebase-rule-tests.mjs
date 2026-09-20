import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function resolveJavaBin() {
  const probe = spawnSync('java', ['-version'], { stdio: 'ignore' });
  if (!probe.error && probe.status === 0) return null;

  if (process.platform !== 'win32') {
    throw new Error('Java 21 ou une version compatible est nécessaire pour les émulateurs Firebase.');
  }

  const adoptiumRoot = 'C:\\Program Files\\Eclipse Adoptium';
  if (!existsSync(adoptiumRoot)) {
    throw new Error('Java est introuvable. Installez Eclipse Temurin JRE 21 puis relancez la commande.');
  }

  const installations = readdirSync(adoptiumRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(adoptiumRoot, entry.name, 'bin'))
    .filter((binPath) => existsSync(join(binPath, 'java.exe')))
    .sort()
    .reverse();

  if (!installations[0]) throw new Error('Java est installé mais java.exe est introuvable.');
  return installations[0];
}

const javaBin = resolveJavaBin();
const environment = { ...process.env };
const pathKey = Object.keys(environment).find((key) => key.toLowerCase() === 'path') || 'PATH';
if (javaBin) environment[pathKey] = `${javaBin};${environment[pathKey] || ''}`;

const firebaseCli = join(process.cwd(), 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js');
const result = spawnSync(process.execPath, [
  firebaseCli,
  'emulators:exec',
  '--only',
  'firestore,storage',
  '--project',
  'demo-storehub',
  'npm run test:rules:only',
], {
  cwd: process.cwd(),
  env: environment,
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
