function normalizeCorsOrigin(value: string): string {
  const url = new URL(value);
  return url.origin === 'null' ? `${url.protocol}//${url.host}` : url.origin;
}

export function parseAllowedOrigins(value: string | undefined): Set<string> {
  return new Set(
    (value || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
      .map(normalizeCorsOrigin),
  );
}

export function isStoreHubOriginAllowed(
  origin: string | undefined,
  allowedOrigins: ReadonlySet<string>,
): boolean {
  // Native clients and server-to-server requests may not send an Origin header.
  if (!origin) return true;
  // An empty list preserves the current local-development behaviour.
  if (allowedOrigins.size === 0) return true;

  try {
    return allowedOrigins.has(normalizeCorsOrigin(origin));
  } catch {
    return false;
  }
}
