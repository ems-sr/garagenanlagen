import type { z } from 'zod';

export type ActionError = { code: string; message: string };
export type ActionResult<T> = { success: true; data: T } | { success: false; error: ActionError };

export function actionError(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } };
}

export function zodActionError(result: z.ZodSafeParseError<unknown>): ActionResult<never> {
  const message = result.error.issues.map((issue) => issue.message).join('; ');
  return actionError('VALIDATION_ERROR', message);
}
