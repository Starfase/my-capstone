// src/domain/waitlistQueue.js
//
// A first-in-first-out queue built as a singly linked list.
// All operations are O(1). It never uses array.shift().

import { DomainError, ErrorCode } from "./errors.js";

export class Queue {
  #head = null;
  #tail = null;
  #size = 0;

  enqueue(value) {
    const node = { value, next: null };

    if (this.#head === null) {
      this.#head = node;
      this.#tail = node;
    } else {
      this.#tail.next = node;
      this.#tail = node;
    }

    this.#size++;
  }

  dequeue() {
    if (this.#head === null) {
      throw new DomainError("dequeue from an empty queue", ErrorCode.NOT_FOUND);
    }

    const value = this.#head.value;
    this.#head = this.#head.next;

    if (this.#head === null) {
      this.#tail = null;
    }

    this.#size--;
    return value;
  }

  peek() {
    if (this.#head === null) {
      throw new DomainError("peek from an empty queue", ErrorCode.NOT_FOUND);
    }

    return this.#head.value;
  }

  size() {
    return this.#size;
  }
}
