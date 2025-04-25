// firestoreConverters.ts

import { TimestampValue, Value } from "../models/firebase.model";

export function getString(field?: Value): string {
  return field?.string_value ?? "";
}

export function getInteger(field?: Value): number {
  const value = field?.integer_value;
  return value !== undefined ? parseInt(value) : 0;
}

export function timestampToSeconds(
  timestamp?: TimestampValue
): string | number | undefined {
  if (!timestamp) return undefined;
  return timestamp.seconds;
}
