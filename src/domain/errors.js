// DomainError constructor order: (message, code) — human text first, then a machine-readable code.
// Money in this project is stored as whole numbers of kobo/cents.

const _ErrorCode = {
  VALIDATION: "VALIDATION",
  NOT_FOUND: "NOT_FOUND",
  SOLD_OUT: "SOLD_OUT",
  INVALID_STATE: "INVALID_STATE",
  NOT_SOLD_OUT: "NOT_SOLD_OUT",
};

export const ErrorCode = Object.freeze(_ErrorCode);

export class DomainError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}
