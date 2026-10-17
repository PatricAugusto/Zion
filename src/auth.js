import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;
const MAX_LOGIN_FAILURES = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const MAX_AUDIT_ENTRIES = 10_000;
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
let databaseWriteQueue = Promise.resolve();
const DUMMY_HASH =
  `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${Buffer.alloc(16).toString("base64url")}$${Buffer.alloc(KEY_LENGTH).toString("base64url")}`;
const AUDIT_ACTIONS = new Set([
  "MASTER_CREATED",
  "LOGIN_SUCCESS",
  "LOGIN_FAILURE",
  "LOGIN_LOCKOUT",
  "USER_CREATED",
  "SCREEN_OBJECTS_OPENED",
  "SCREEN_ALERTS_OPENED",
  "SCREEN_INTEGRITY_OPENED",
  "SCREEN_SECTORS_OPENED",
  "SCREEN_ALERT_SUMMARY_OPENED",
  "SCREEN_SECURITY_OPENED",
  "SCREEN_OBSERVABILITY_OPENED",
  "SCREEN_LEARNING_OPENED",
  "SCREEN_SESSION_LOG_OPENED",
  "INVALID_INPUT",
  "SESSION_ENDED",
]);

function serializeDatabaseWrite(operation) {
  const pendingOperation = databaseWriteQueue.then(operation, operation);
  databaseWriteQueue = pendingOperation.then(
    () => undefined,
    () => undefined,
  );
  return pendingOperation;
}

export function normalizeUsername(username) {
  if (typeof username !== "string") {
    throw new TypeError("O nome de usuário deve ser texto.");
  }

  const normalized = username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(normalized)) {
    throw new TypeError("Use de 3 a 32 caracteres: letras, números, ponto, hífen ou sublinhado.");
  }

  return normalized;
}

export function validatePassword(password) {
  if (
    typeof password !== "string" ||
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    throw new TypeError(
      `A senha deve ter entre ${PASSWORD_MIN_LENGTH} e ${PASSWORD_MAX_LENGTH} caracteres.`,
    );
  }
}

export async function hashPassword(password) {
  validatePassword(password);
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 32 * 1024 * 1024,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

async function verifyPassword(password, encodedHash) {
  const [algorithm, nText, rText, pText, saltText, keyText] = encodedHash.split("$");
  if (
    algorithm !== "scrypt" ||
    Number(nText) !== SCRYPT_N ||
    Number(rText) !== SCRYPT_R ||
    Number(pText) !== SCRYPT_P ||
    !saltText ||
    !keyText
  ) {
    return false;
  }

  const salt = Buffer.from(saltText, "base64url");
  const expectedKey = Buffer.from(keyText, "base64url");
  if (salt.length !== 16 || expectedKey.length !== KEY_LENGTH) return false;

  const actualKey = await scrypt(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 32 * 1024 * 1024,
  });
  return timingSafeEqual(actualKey, expectedKey);
}

async function recordAudit(transaction, actorId, action) {
  const entry = await transaction.auditEntry.create({
    data: { actorId, action },
  });
  const count = await transaction.auditEntry.count();
  const excess = count - MAX_AUDIT_ENTRIES;
  if (excess > 0) {
    const oldestEntries = await transaction.auditEntry.findMany({
      where: { id: { not: entry.id } },
      take: excess,
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    await transaction.auditEntry.deleteMany({
      where: { id: { in: oldestEntries.map(({ id }) => id) } },
    });
  }
  return entry;
}

export async function recordAuditEntry(prisma, actorId, action) {
  if (!AUDIT_ACTIONS.has(action)) {
    throw new TypeError("Tipo de evento de auditoria inválido.");
  }
  return serializeDatabaseWrite(() =>
    prisma.$transaction((transaction) =>
      recordAudit(transaction, actorId, action),
    ),
  );
}

export async function ensureCreatorAccount(prisma, input) {
  const existingCount = await prisma.user.count();
  if (existingCount > 0) {
    const creator = await prisma.user.findUnique({
      where: { username: "creator" },
      select: { id: true },
    });
    if (!creator) {
      throw new Error(
        "Há contas no banco, mas a conta Creator não existe. A inicialização foi interrompida; procure o administrador do banco.",
      );
    }
    return false;
  }

  validatePassword(input.password);
  if (input.password !== input.confirmPassword) {
    throw new TypeError("As senhas não coincidem.");
  }

  const passwordHash = await hashPassword(input.password);
  return serializeDatabaseWrite(async () => {
    const usersNow = await prisma.user.count();
    if (usersNow > 0) {
      const creator = await prisma.user.findUnique({
        where: { username: "creator" },
        select: { id: true },
      });
      if (!creator) {
        throw new Error(
          "Há contas no banco, mas a conta Creator não existe. A inicialização foi interrompida; procure o administrador do banco.",
        );
      }
      return false;
    }

    await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          username: "creator",
          passwordHash,
          role: "MASTER",
        },
      });
      await recordAudit(transaction, user.id, "MASTER_CREATED");
    });
    return true;
  });
}

export async function authenticate(prisma, username, password, now = new Date()) {
  let normalizedUsername;
  try {
    normalizedUsername = normalizeUsername(username);
  } catch {
    await verifyPassword("invalid-username", DUMMY_HASH);
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { username: normalizedUsername },
  });
  if (!user) {
    const candidate = typeof password === "string" && password.length <= PASSWORD_MAX_LENGTH
      ? password
      : "invalid-password";
    await verifyPassword(candidate, DUMMY_HASH);
    return null;
  }

  if (!user.isActive || (user.lockedUntil && user.lockedUntil > now)) {
    const candidate = typeof password === "string" && password.length <= PASSWORD_MAX_LENGTH
      ? password
      : "invalid-password";
    await verifyPassword(candidate, user.passwordHash);
    return null;
  }

  const passwordIsValid =
    typeof password === "string" &&
    password.length <= PASSWORD_MAX_LENGTH &&
    await verifyPassword(password, user.passwordHash);

  return serializeDatabaseWrite(() =>
    prisma.$transaction(async (transaction) => {
      const currentUser = await transaction.user.findUnique({
        where: { id: user.id },
      });
      if (!currentUser?.isActive || (currentUser.lockedUntil && currentUser.lockedUntil > now)) {
        return null;
      }

      if (passwordIsValid) {
        await transaction.user.update({
          where: { id: currentUser.id },
          data: { failedLoginAttempts: 0, lockedUntil: null },
        });
        await recordAudit(transaction, currentUser.id, "LOGIN_SUCCESS");
        return {
          id: currentUser.id,
          username: currentUser.username,
          role: currentUser.role,
        };
      }

      const isExpiredLock =
        currentUser.lockedUntil !== null && currentUser.lockedUntil <= now;
      const failures = (isExpiredLock ? 0 : currentUser.failedLoginAttempts) + 1;
      const isLocked = failures >= MAX_LOGIN_FAILURES;
      await transaction.user.update({
        where: { id: currentUser.id },
        data: {
          failedLoginAttempts: isLocked ? 0 : failures,
          lockedUntil: isLocked ? new Date(now.getTime() + LOCKOUT_DURATION_MS) : null,
        },
      });
      await recordAudit(
        transaction,
        currentUser.id,
        isLocked ? "LOGIN_LOCKOUT" : "LOGIN_FAILURE",
      );
      return null;
    }),
  );
}

export async function createUser(prisma, actor, username, password, confirmPassword) {
  if (!actor || actor.role !== "MASTER") {
    throw new Error("Apenas o Admin Master pode criar contas.");
  }

  const normalizedUsername = normalizeUsername(username);
  if (normalizedUsername === "creator") {
    throw new TypeError("O nome Creator é reservado para o Admin Master.");
  }
  validatePassword(password);
  if (password !== confirmPassword) {
    throw new TypeError("As senhas não coincidem.");
  }
  const passwordHash = await hashPassword(password);

  return serializeDatabaseWrite(() =>
    prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          username: normalizedUsername,
          passwordHash,
          role: "USER",
        },
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
        },
      });
      await recordAudit(transaction, actor.id, "USER_CREATED");
      return user;
    }),
  );
}

export async function listUsers(prisma, actor) {
  if (!actor || actor.role !== "MASTER") {
    throw new Error("Apenas o Admin Master pode consultar as contas.");
  }
  return prisma.user.findMany({
    select: {
      username: true,
      role: true,
      isActive: true,
      createdAt: true,
      lockedUntil: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

const AUDIT_LABELS = new Map([
  ["MASTER_CREATED", "Administrador Creator provisionado"],
  ["LOGIN_SUCCESS", "Autenticação aprovada"],
  ["LOGIN_FAILURE", "Autenticação rejeitada"],
  ["LOGIN_LOCKOUT", "Conta bloqueada por tentativas inválidas"],
  ["USER_CREATED", "Conta de usuário criada"],
  ["SCREEN_OPENED", "Tela aberta"],
  ["SCREEN_OBJECTS_OPENED", "Tela de objetos aberta"],
  ["SCREEN_ALERTS_OPENED", "Tela de alertas aberta"],
  ["SCREEN_INTEGRITY_OPENED", "Tela de integridade aberta"],
  ["SCREEN_SECTORS_OPENED", "Análise de setores aberta"],
  ["SCREEN_ALERT_SUMMARY_OPENED", "Resumo de alertas aberto"],
  ["SCREEN_SECURITY_OPENED", "Princípios de segurança abertos"],
  ["SCREEN_OBSERVABILITY_OPENED", "Séries de observabilidade abertas"],
  ["SCREEN_LEARNING_OPENED", "Leitura guiada aberta"],
  ["SCREEN_SESSION_LOG_OPENED", "Registro da sessão aberto"],
  ["INVALID_INPUT", "Entrada de menu rejeitada"],
  ["SESSION_ENDED", "Sessão encerrada"],
]);

export async function listAuditEntries(prisma, actor) {
  if (!actor || actor.role !== "MASTER") {
    throw new Error("Apenas o Admin Master pode consultar a auditoria.");
  }
  const entries = await prisma.auditEntry.findMany({
    take: 30,
    orderBy: { createdAt: "desc" },
    include: {
      actor: { select: { username: true } },
    },
  });
  return entries.map(({ id, action, createdAt, actor: auditActor }) => ({
    id,
    action: AUDIT_LABELS.get(action) ?? "Evento não reconhecido",
    createdAt,
    actor: auditActor?.username ?? "—",
  }));
}

export const AUTH_LIMITS = Object.freeze({
  maxLoginFailures: MAX_LOGIN_FAILURES,
  lockoutDurationMs: LOCKOUT_DURATION_MS,
  passwordMinLength: PASSWORD_MIN_LENGTH,
  passwordMaxLength: PASSWORD_MAX_LENGTH,
});
