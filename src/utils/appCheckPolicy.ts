export type AppCheckMode = 'off' | 'monitor' | 'enforce';
export type AppCheckTokenState = 'valid' | 'missing' | 'invalid';

export interface AppCheckDecision {
  allow: boolean;
  shouldLog: boolean;
  statusCode?: 401 | 403;
}

export function parseAppCheckMode(value: string | undefined): AppCheckMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'enforce' || normalized === 'monitor' || normalized === 'off') return normalized;
  return 'monitor';
}

export function decideAppCheckAccess(mode: AppCheckMode, state: AppCheckTokenState): AppCheckDecision {
  if (mode === 'off' || state === 'valid') {
    return { allow: true, shouldLog: false };
  }
  if (mode === 'monitor') {
    return { allow: true, shouldLog: true };
  }
  return {
    allow: false,
    shouldLog: true,
    statusCode: state === 'missing' ? 401 : 403,
  };
}
