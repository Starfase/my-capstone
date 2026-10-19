// src/domain/ids.js
//
// Generate IDs and short booking reference codes.
// Uses node:crypto only — never Math.random.
//
// Alphabet for booking references (32 characters):
//   23456789ABCDEFGHJKLMNPQRSTUVWXYZ
//
// Left out of A-Z + 0-9 (exactly four), with reasons:
//   0  — sounds like "O", looks like O
//   1  — looks like I, sounds like "one" (easily mistaken for I)
//   I  — looks like 1, sounds like "eye"
//   O  — sounds like "zero", looks like 0
//
// Q is kept in the alphabet. Reference codes are 8 characters long,
// giving 32^8 = 1,099,511,627,776 possible codes.

import { randomUUID, randomInt } from "node:crypto";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function newId() {
  return randomUUID();
}

export function newReference() {
  let code = "";
  for (let i = 0; i < 8; i++) {
    const index = randomInt(ALPHABET.length);
    code += ALPHABET[index];
  }
  return code;
}
