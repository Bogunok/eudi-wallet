import api from './api';
import { lock } from './wallet-lock';

export type Role = 'HOLDER' | 'ISSUER' | 'VERIFIER' | 'ADMIN';

export interface CurrentUser {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const response = await api.get<{
      success: boolean;
      message: string;
      data: CurrentUser;
    }>('/user');
    return response.data.data;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout', {});
  } catch {}
  lock();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

export async function resetAccount(email: string, password: string): Promise<void> {
  await api.post('/auth/reset-account', { email, password });

  lock();
  if (typeof window !== 'undefined') {
    localStorage.removeItem('savedEmail');
  }
}

export function hasRole(user: CurrentUser | null, ...allowed: Role[]): boolean {
  if (!user) return false;
  return allowed.includes(user.role);
}

export function defaultRouteForRole(role: Role): string {
  switch (role) {
    case 'HOLDER':
      return '/wallet';
    case 'ISSUER':
      return '/issuer';
    case 'VERIFIER':
      return '/verifier';
    case 'ADMIN':
      return '/admin';
  }
}
