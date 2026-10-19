// DomainError constructor order: (message, code) — human text first, then a machine-readable code.

export const ErrorCode = Object.freeze({
  VALIDATION: "VALIDATION",
  NOT_FOUND: "NOT_FOUND",
  SOLD_OUT: "SOLD_OUT",
  INVALID_STATE: "INVALID_STATE",
});

export class DomainError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}
