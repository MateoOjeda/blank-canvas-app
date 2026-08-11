import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";

// ─── Types ─────────────────────────────────────────────────────────────────────

/** Represents the shape of a Firestore Timestamp as it arrives from Firestore SDK */
type FirestoreTimestamp = {
  seconds: number;
  nanoseconds: number;
  toDate?: () => Date;
};

/** Any value that might represent a date coming from Firestore */
export type DateInput = string | FirestoreTimestamp | Date | null | undefined;

// ─── Core conversion ──────────────────────────────────────────────────────────

/**
 * Converts any Firestore-compatible date input to a JS Date.
 *
 * Handles:
 *   - ISO strings (e.g. "2024-03-15T10:00:00Z")
 *   - Firestore Timestamp objects ({ seconds, nanoseconds, toDate? })
 *   - JS Date objects
 *   - null / undefined / empty string → returns null
 *
 * Never throws. Returns null when the value cannot be converted to a valid date.
 */
export function toDate(value: DateInput): Date | null {
  if (value == null) return null;

  // Already a Date object
  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  // Firestore Timestamp object: { seconds, nanoseconds }
  if (typeof value === "object" && "seconds" in value) {
    try {
      if (typeof (value as FirestoreTimestamp).toDate === "function") {
        const d = (value as FirestoreTimestamp).toDate!();
        return isValid(d) ? d : null;
      }
      const d = new Date((value as FirestoreTimestamp).seconds * 1000);
      return isValid(d) ? d : null;
    } catch {
      return null;
    }
  }

  // ISO / plain string
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const d = parseISO(trimmed);
      if (isValid(d)) return d;
      // Fallback: try native Date constructor for non-ISO strings
      const d2 = new Date(trimmed);
      return isValid(d2) ? d2 : null;
    } catch {
      try {
        const d = new Date(value);
        return isValid(d) ? d : null;
      } catch {
        return null;
      }
    }
  }

  return null;
}

// ─── Safe format ──────────────────────────────────────────────────────────────

/**
 * Safely formats a date-like value using date-fns format().
 *
 * @param value     - Any date-like input (string, Timestamp, Date, null, undefined)
 * @param formatStr - date-fns format string (e.g. "d 'de' MMMM yyyy")
 * @param fallback  - String to return when the value is invalid/missing (default "—")
 * @param options   - Optional date-fns format options (e.g. { locale: es })
 */
export function safeFormat(
  value: DateInput,
  formatStr: string,
  fallback = "—",
  options: { locale?: typeof es } = {}
): string {
  const d = toDate(value);
  if (!d) return fallback;
  try {
    return format(d, formatStr, options);
  } catch {
    return fallback;
  }
}

/**
 * Converts a DateInput to a comparable ISO string.
 * Returns "" when the value is invalid, making sorts safe.
 */
export function toSortableString(value: DateInput): string {
  const d = toDate(value);
  if (!d) return "";
  try {
    return d.toISOString();
  } catch {
    return "";
  }
}
