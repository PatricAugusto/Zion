export const MAX_CONSECUTIVE_INVALID_ATTEMPTS = 10;

export function createMenuAttemptGuard() {
  let consecutiveInvalidAttempts = 0;

  return Object.freeze({
    recordInvalidAttempt() {
      consecutiveInvalidAttempts += 1;
      return consecutiveInvalidAttempts >= MAX_CONSECUTIVE_INVALID_ATTEMPTS;
    },

    recordValidChoice() {
      consecutiveInvalidAttempts = 0;
    },
  });
}
