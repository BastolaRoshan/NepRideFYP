import { getSessionToken } from './sessionAuth';

export const apiFetch = (input, init = {}) => {
  const headers = new Headers(init.headers || {});
  const token = getSessionToken();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const timeoutMs = Number.isFinite(Number(init.timeoutMs)) ? Number(init.timeoutMs) : 12000;
  const hasExternalSignal = Boolean(init.signal);
  const controller = hasExternalSignal ? null : new AbortController();

  let timeoutId = null;
  if (controller && timeoutMs > 0) {
    timeoutId = setTimeout(() => controller.abort(new Error('Request timed out')), timeoutMs);
  }

  const { timeoutMs: _ignoredTimeoutMs, ...restInit } = init;

  return fetch(input, {
    ...restInit,
    headers,
    credentials: 'omit',
    signal: restInit.signal || controller?.signal,
  }).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
};
