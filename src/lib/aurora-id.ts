// src/lib/aurora-id.ts

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR';

export interface UserProfile {
  userId: string;
  pin: string;
  fullName: string;
  phoneWA: string;
  role: UserRole;
}

// Akun Admin Default Awal
export const DEFAULT_ADMIN: UserProfile = {
  userId: 'AUROR62710',
  pin: '123456',
  fullName: 'Super Admin Aurora',
  phoneWA: '08211307710',
  role: 'SUPER_ADMIN',
};

export function getStoredUsers(): UserProfile[] {
  if (typeof window === 'undefined') return [DEFAULT_ADMIN];
  const raw = localStorage.getItem('aurora_users');
  if (!raw) {
    localStorage.setItem('aurora_users', JSON.stringify([DEFAULT_ADMIN]));
    return [DEFAULT_ADMIN];
  }
  const users: UserProfile[] = JSON.parse(raw);
  // Pastikan akun admin default selalu tersedia (migrasi dari ID lama)
  if (!users.some((u) => u.userId === DEFAULT_ADMIN.userId)) {
    const migrated = users
      .filter((u) => u.userId !== 'AUROR61710')
      .concat(DEFAULT_ADMIN);
    localStorage.setItem('aurora_users', JSON.stringify(migrated));
    return migrated;
  }
  return users;
}

export function saveUsers(users: UserProfile[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('aurora_users', JSON.stringify(users));
  }
}

export function getActiveSession(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  const session = localStorage.getItem('aurora_active_session');
  return session ? JSON.parse(session) : null;
}

export function setActiveSession(user: UserProfile | null) {
  if (typeof window !== 'undefined') {
    if (user) {
      localStorage.setItem('aurora_active_session', JSON.stringify(user));
    } else {
      localStorage.removeItem('aurora_active_session');
    }
  }
}