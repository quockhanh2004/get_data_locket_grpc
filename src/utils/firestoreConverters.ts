// firestoreConverters.ts

import { TimestampValue, Value } from "../models/firebase.model";

export function getString(field?: Value): string | undefined {
  return field?.string_value;
}

export function getInteger(field?: Value): number | undefined {
  const value = field?.integer_value;
  return value !== undefined ? parseInt(value) : 0;
}

export function getBoolean(field?: Value): boolean | undefined {
  return field?.boolean_value;
}

export function getMap(field?: Value): any | undefined {
  return field?.map_value?.fields;
}

export function timestampToSeconds(
  timestamp?: TimestampValue
): string | number | undefined {
  if (!timestamp) return undefined;
  return timestamp.seconds;
}
