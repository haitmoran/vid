export type SessionUser = {
  username: string;
  normalizedUsername: string;
  hasRecoveryEmail: boolean;
};

type StoredUser = {
  version: 1;
  username: string;
  normalizedUsername: string;
  emailHash?: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
};

const USERS_KEY = "kinet-users-v1";
const SESSION_KEY = "kinet-session-v1";
const LIKES_PREFIX = "kinet-likes-v1:";
const LOVED_STARS_PREFIX = "kinet-loved-stars-v1:";
const PBKDF2_ITERATIONS = 180_000;
export const MANAGER_USERNAME = "moran";

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validateUsername(username: string): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{2,23}$/.test(username.trim())) {
    throw new Error(
      "Username must be 3–24 characters and use letters, numbers, dots, dashes, or underscores.",
    );
  }
}

function validatePassword(password: string): void {
  if (password.length < 8) throw new Error("Password must contain at least 8 characters.");
  if (password.length > 128) throw new Error("Password must be 128 characters or fewer.");
}

function validateEmail(email: string): void {
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address or leave the field empty.");
  }
}

function readUsers(): StoredUser[] {
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    // Unreadable, blocked, or corrupt account storage must never break the
    // site. Callers treat this as "no accounts on this device"; the next
    // successful write replaces the damaged value.
    return Array.isArray(parsed) ? (parsed as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]): void {
  try {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    throw new Error("Unable to save this account in your browser.");
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return window.btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = window.atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function derivePasswordHash(password: string, salt: Uint8Array): Promise<string> {
  const key = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const bits = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
    },
    key,
    256,
  );

  return bytesToBase64(new Uint8Array(bits));
}

async function hashRecoveryEmail(email: string): Promise<string> {
  const digest = await window.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalizeEmail(email)),
  );
  return bytesToBase64(new Uint8Array(digest));
}

function toSession(user: StoredUser): SessionUser {
  return {
    username: user.username,
    normalizedUsername: user.normalizedUsername,
    hasRecoveryEmail: Boolean(user.emailHash),
  };
}

function saveSession(user: StoredUser): SessionUser {
  try {
    window.sessionStorage.setItem(SESSION_KEY, user.normalizedUsername);
  } catch {
    // The sign-in still applies to this page even if it cannot be persisted.
  }
  return toSession(user);
}

export function getSession(): SessionUser | null {
  let normalizedUsername: string | null = null;
  try {
    normalizedUsername = window.sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
  if (!normalizedUsername) return null;

  const user = readUsers().find((candidate) => candidate.normalizedUsername === normalizedUsername);
  if (!user) {
    signOut();
    return null;
  }

  return toSession(user);
}

export function signOut(): void {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}

export async function registerAccount(input: {
  username: string;
  password: string;
  email?: string;
}): Promise<SessionUser> {
  const username = input.username.trim();
  const normalized = normalizeUsername(username);
  const email = normalizeEmail(input.email ?? "");

  validateUsername(username);
  validatePassword(input.password);
  validateEmail(email);

  if (normalized === MANAGER_USERNAME) {
    throw new Error("The manager account already exists. Sign in instead.");
  }

  const users = readUsers();
  if (users.some((user) => user.normalizedUsername === normalized)) {
    throw new Error("That username is already registered on this device.");
  }

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const user: StoredUser = {
    version: 1,
    username,
    normalizedUsername: normalized,
    emailHash: email ? await hashRecoveryEmail(email) : undefined,
    salt: bytesToBase64(salt),
    passwordHash: await derivePasswordHash(input.password, salt),
    createdAt: new Date().toISOString(),
  };

  writeUsers([...users, user]);
  return saveSession(user);
}

export async function signInAccount(
  username: string,
  password: string,
): Promise<SessionUser> {
  const normalized = normalizeUsername(username);
  const user = readUsers().find((candidate) => candidate.normalizedUsername === normalized);
  if (!user) throw new Error("Incorrect username or password.");

  const hash = await derivePasswordHash(password, base64ToBytes(user.salt));
  if (hash !== user.passwordHash) throw new Error("Incorrect username or password.");
  return saveSession(user);
}

export async function establishManagerSession(
  username: string,
  password: string,
): Promise<SessionUser> {
  const displayUsername = username.trim();
  const normalized = normalizeUsername(displayUsername);
  if (normalized !== MANAGER_USERNAME) throw new Error("Manager account not recognized.");
  validatePassword(password);

  const users = readUsers();
  const existingIndex = users.findIndex(
    (candidate) => candidate.normalizedUsername === MANAGER_USERNAME,
  );
  const existing = users[existingIndex];
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const manager: StoredUser = {
    version: 1,
    username: displayUsername || MANAGER_USERNAME,
    normalizedUsername: MANAGER_USERNAME,
    emailHash: existing?.emailHash,
    salt: bytesToBase64(salt),
    passwordHash: await derivePasswordHash(password, salt),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };

  if (existingIndex >= 0) users[existingIndex] = manager;
  else users.push(manager);
  writeUsers(users);
  return saveSession(manager);
}

export async function resetPassword(input: {
  username: string;
  email: string;
  newPassword: string;
}): Promise<SessionUser> {
  if (normalizeUsername(input.username) === MANAGER_USERNAME) {
    throw new Error("The manager password is managed by secure analytics sign-in.");
  }
  validatePassword(input.newPassword);
  validateEmail(normalizeEmail(input.email));

  const users = readUsers();
  const userIndex = users.findIndex(
    (candidate) => candidate.normalizedUsername === normalizeUsername(input.username),
  );
  const user = users[userIndex];

  if (!user?.emailHash) throw new Error("This account does not have a recovery email.");
  if ((await hashRecoveryEmail(input.email)) !== user.emailHash) {
    throw new Error("The username and recovery email do not match.");
  }

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  users[userIndex] = {
    ...user,
    salt: bytesToBase64(salt),
    passwordHash: await derivePasswordHash(input.newPassword, salt),
  };
  writeUsers(users);
  return saveSession(users[userIndex]);
}

export async function changePassword(input: {
  normalizedUsername: string;
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  if (input.normalizedUsername === MANAGER_USERNAME) {
    throw new Error("The manager password is managed by secure analytics sign-in.");
  }
  validatePassword(input.newPassword);

  const users = readUsers();
  const userIndex = users.findIndex(
    (candidate) => candidate.normalizedUsername === input.normalizedUsername,
  );
  const user = users[userIndex];
  if (!user) throw new Error("Account not found on this device.");

  const currentHash = await derivePasswordHash(
    input.currentPassword,
    base64ToBytes(user.salt),
  );
  if (currentHash !== user.passwordHash) throw new Error("Current password is incorrect.");

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  users[userIndex] = {
    ...user,
    salt: bytesToBase64(salt),
    passwordHash: await derivePasswordHash(input.newPassword, salt),
  };
  writeUsers(users);
}

export function getLikedVideoIds(normalizedUsername: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(`${LIKES_PREFIX}${normalizedUsername}`);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function saveLikedVideoIds(
  normalizedUsername: string,
  videoIds: Set<string>,
): void {
  try {
    window.localStorage.setItem(
      `${LIKES_PREFIX}${normalizedUsername}`,
      JSON.stringify([...videoIds]),
    );
  } catch {
    // A full or blocked store must not break the like button; the choice
    // still applies for this session.
  }
}

export function getLovedStarSlugs(normalizedUsername: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(
      `${LOVED_STARS_PREFIX}${normalizedUsername}`,
    );
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function saveLovedStarSlugs(
  normalizedUsername: string,
  starSlugs: Set<string>,
): void {
  try {
    window.localStorage.setItem(
      `${LOVED_STARS_PREFIX}${normalizedUsername}`,
      JSON.stringify([...starSlugs]),
    );
  } catch {
    // See saveLikedVideoIds.
  }
}
