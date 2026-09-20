export const STOREHUB_PUBLIC_URL = 'https://store-hub-2026.web.app';

type RuntimeEnvironment = Record<string, string | boolean | undefined>;

function readViteEnvironment(): RuntimeEnvironment {
  return (import.meta as ImportMeta & { env?: RuntimeEnvironment }).env || {};
}

function normalizeOrigin(value: string | undefined): string {
  const candidate = value?.trim();
  if (!candidate) return '';

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error('VITE_API_ORIGIN doit être une adresse HTTPS valide.');
  }

  const localDevelopment = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !localDevelopment) {
    throw new Error('VITE_API_ORIGIN doit utiliser HTTPS hors développement local.');
  }

  return url.origin;
}

/**
 * Resolves relative StoreHub API paths for both the web application and the
 * future Capacitor WebView. When no production origin is supplied, relative
 * URLs keep the current local-development behaviour.
 */
export function resolveStoreHubApiUrl(
  input: RequestInfo | URL,
  configuredOrigin = readViteEnvironment().VITE_API_ORIGIN as string | undefined,
): RequestInfo | URL {
  if (typeof input !== 'string' || !input.startsWith('/api/')) return input;

  const origin = normalizeOrigin(configuredOrigin);
  return origin ? `${origin}${input}` : input;
}
