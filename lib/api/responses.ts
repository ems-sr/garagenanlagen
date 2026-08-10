import { NextResponse } from 'next/server';
import type { z } from 'zod';

export function jsonError(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function zodError(result: z.ZodSafeParseError<unknown>): NextResponse {
  const message = result.error.issues.map((issue) => issue.message).join('; ');
  return jsonError(400, 'VALIDATION_ERROR', message);
}

const FOREIGN_KEY_VIOLATION = '23503';
const UNIQUE_VIOLATION = '23505';

// Restrict is the default onDelete behavior across the Stage 2 contract, so
// deleting a row still referenced elsewhere surfaces as a raw SqlQueryError
// (sqlState 23503) unless the route catches it — map it to a clean 409
// instead of letting it bubble up as a 500.
export function isForeignKeyViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'sqlState' in error && error.sqlState === FOREIGN_KEY_VIOLATION;
}

// Sibling to isForeignKeyViolation for @@unique constraints (e.g. Stage 8's
// ShiftParticipant one-row-per-member-per-shift rule) — same rationale, map
// to a clean 409 instead of a raw 500.
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'sqlState' in error && error.sqlState === UNIQUE_VIOLATION;
}
