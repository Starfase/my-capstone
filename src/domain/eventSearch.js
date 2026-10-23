// src/domain/eventSearch.js
//
// Pure event-search helpers for Build 2.
// They receive event summaries and return new arrays; they never mutate
// the input summaries or the summary objects.
//
// Summaries are the objects produced by inventory.listEventSummaries:
//   id, title, venue, city, date, cheapestPriceCents, seatsLeft
//
// cheapestPriceCents is a whole-number cent price, or null when the event
// has no tiers.
//
// Errors use DomainError with a machine-readable ErrorCode.

import { mergeSort } from "./sorting.js";
import { DomainError, ErrorCode } from "./errors.js";

// ---------- helpers ----------

function parseDateOrFail(value, name) {
  if (value === undefined || value === null || typeof value !== "string") {
    throw new DomainError(
      `${name} must be a valid date string`,
      ErrorCode.VALIDATION,
    );
  }

  const trimmed = value.trim();

  if (isDateOnly(trimmed)) {
    const parsedCalendar = parseCalendarDate(trimmed);
    if (!parsedCalendar) {
      throw new DomainError(
        `${name} is not a valid date`,
        ErrorCode.VALIDATION,
      );
    }
    return new Date(`${trimmed}T00:00:00`);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new DomainError(
      `${name} is not a valid date`,
      ErrorCode.VALIDATION,
    );
  }

  return parsed;
}

function isDateOnly(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

function parseCalendarDate(str) {
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!isValidCalendarDate(year, month, day)) {
    return null;
  }

  return { year, month, day };
}

function isValidCalendarDate(year, month, day) {
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1) {
    return false;
  }

  const daysInMonth = daysInMonthFor(year, month);
  return day <= daysInMonth;
}

function daysInMonthFor(year, month) {
  switch (month) {
    case 1:
    case 3:
    case 5:
    case 7:
    case 8:
    case 10:
    case 12:
      return 31;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    case 2:
      return isLeapYear(year) ? 29 : 28;
    default:
      return 0;
  }
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function extractCalendarDate(value) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ]\d{2}:\d{2}:\d{2})?/);
  if (!match) {
    return null;
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

// ---------- public API ----------

export function filterEvents(summaries, criteria) {
  const filtered = [];

  const q = criteria.q;
  const city = criteria.city;
  const from = criteria.from;
  const to = criteria.to;
  const maxPriceCents = criteria.maxPriceCents;
  const onlyAvailable = criteria.onlyAvailable;

  let fromParsed = undefined;
  let toParsed = undefined;
  let toIsDateOnly = false;
  let toCalendarDate = undefined;
  let fromIsDateOnly = false;
  let fromCalendarDate = undefined;

  if (from !== undefined) {
    if (from === null || typeof from !== "string") {
      throw new DomainError(
        "from must be a valid date string",
        ErrorCode.VALIDATION,
      );
    }

    const trimmedFrom = from.trim();
    if (isDateOnly(trimmedFrom)) {
      const parsedCalendar = parseCalendarDate(trimmedFrom);
      if (!parsedCalendar) {
        throw new DomainError(
          "from is not a valid date",
          ErrorCode.VALIDATION,
        );
      }
      fromParsed = parseDateOrFail(trimmedFrom, "from");
      fromIsDateOnly = true;
      fromCalendarDate = trimmedFrom;
    } else {
      fromParsed = parseDateOrFail(trimmedFrom, "from");
      fromIsDateOnly = false;
      fromCalendarDate = undefined;
    }
  }

  if (to !== undefined) {
    if (to === null || typeof to !== "string") {
      throw new DomainError(
        "to must be a valid date string",
        ErrorCode.VALIDATION,
      );
    }

    const trimmedTo = to.trim();
    toIsDateOnly = isDateOnly(trimmedTo);

    if (toIsDateOnly) {
      const parsedCalendar = parseCalendarDate(trimmedTo);
      if (!parsedCalendar) {
        throw new DomainError(
          "to is not a valid date",
          ErrorCode.VALIDATION,
        );
      }
      toCalendarDate = trimmedTo;
      toParsed = undefined;
    } else {
      toParsed = parseDateOrFail(trimmedTo, "to");
      toCalendarDate = undefined;
    }
  }

  if (maxPriceCents !== undefined) {
    if (
      typeof maxPriceCents !== "number" ||
      !Number.isFinite(maxPriceCents) ||
      !Number.isInteger(maxPriceCents) ||
      maxPriceCents < 0
    ) {
      throw new DomainError(
        "maxPriceCents must be a whole number",
        ErrorCode.VALIDATION,
      );
    }
  }

  for (const summary of summaries) {
    if (q !== undefined) {
      const matchText = (summary.title + " " + summary.venue).toLowerCase();
      if (!matchText.includes(q.toLowerCase())) {
        continue;
      }
    }

    if (city !== undefined) {
      if (summary.city.toLowerCase() !== city.toLowerCase()) {
        continue;
      }
    }

    if (fromParsed !== undefined) {
      if (fromIsDateOnly) {
        const summaryCalendarDate = extractCalendarDate(summary.date);
        if (summaryCalendarDate === null || summaryCalendarDate < fromCalendarDate) {
          continue;
        }
      } else {
        const eventDate = new Date(summary.date);
        if (Number.isNaN(eventDate.getTime()) || eventDate.getTime() < fromParsed.getTime()) {
          continue;
        }
      }
    }

    if (toParsed !== undefined) {
      const eventDate = new Date(summary.date);
      if (Number.isNaN(eventDate.getTime()) || eventDate.getTime() > toParsed.getTime()) {
        continue;
      }
    } else if (toCalendarDate !== undefined) {
      const summaryCalendarDate = extractCalendarDate(summary.date);
      if (summaryCalendarDate === null) {
        continue;
      }
      if (summaryCalendarDate > toCalendarDate) {
        continue;
      }
    }

    if (maxPriceCents !== undefined) {
      if (summary.cheapestPriceCents === null || summary.cheapestPriceCents > maxPriceCents) {
        continue;
      }
    }

    if (onlyAvailable === true) {
      if (summary.seatsLeft <= 0) {
        continue;
      }
    }

    filtered.push(summary);
  }

  return filtered;
}

export function sortEvents(summaries, sortBy) {
  if (sortBy === undefined || sortBy === null) {
    throw new DomainError(
      "sortBy is required",
      ErrorCode.VALIDATION,
    );
  }

  if (sortBy === "date") {
    return mergeSort(summaries, compareDate);
  }
  if (sortBy === "price") {
    return mergeSort(summaries, comparePrice);
  }
  if (sortBy === "availability") {
    return mergeSort(summaries, compareAvailability);
  }

  throw new DomainError(
    `unknown sortBy: ${sortBy}`,
    ErrorCode.VALIDATION,
  );
}

export function searchEvents(summaries, criteria, sortBy) {
  const filtered = filterEvents(summaries, criteria);
  return sortEvents(filtered, sortBy);
}

// ---------- compare functions ----------

function compareDate(a, b) {
  const dateA = parseEventDate(a.date);
  const dateB = parseEventDate(b.date);
  const diff = dateA.getTime() - dateB.getTime();

  if (diff !== 0) {
    return diff;
  }

  return tieBreak(a, b);
}

function comparePrice(a, b) {
  const priceA = a.cheapestPriceCents;
  const priceB = b.cheapestPriceCents;

  if (priceA === null && priceB === null) {
    return tieBreak(a, b);
  }
  if (priceA === null) {
    return 1;
  }
  if (priceB === null) {
    return -1;
  }

  if (priceA !== priceB) {
    return priceA - priceB;
  }

  return tieBreak(a, b);
}

function compareAvailability(a, b) {
  const diff = b.seatsLeft - a.seatsLeft;

  if (diff !== 0) {
    return diff;
  }

  return tieBreak(a, b);
}

function tieBreak(a, b) {
  if (a.title !== b.title) {
    return a.title < b.title ? -1 : 1;
  }
  if (a.id !== b.id) {
    return a.id < b.id ? -1 : 1;
  }
  return 0;
}

// ---------- small shared helpers ----------

function parseEventDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(NaN);
  }
  return parsed;
}

function isWholeNumber(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0
  );
}
