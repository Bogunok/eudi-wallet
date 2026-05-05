/**
 * "Soft-lock" for wallet.
 *
 * Concept: cookies from accessToken/refreshToken live long time (1h / 7d).
 * But we don't want the wallet to be accessible right after the user authenticates — we want them to enter the PIN first.
 * So we keep the "unlocked" state separately, and reset it on page load. When the user enters the PIN, we set "unlocked" to true, and the wallet becomes accessible.
 *
 * SSR-safe: all functions check for window before accessing sessionStorage, so they can be imported and used in any component without worrying about SSR issues.
 */

const KEY = 'walletUnlocked';

export function unlock(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(KEY, '1');
}

export function lock(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(KEY);
}

export function isUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(KEY) === '1';
}
