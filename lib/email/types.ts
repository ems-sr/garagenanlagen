export type CorrespondenceError = { code: string; message: string };
export type CorrespondenceResult<T> = { success: true; data: T } | { success: false; error: CorrespondenceError };

export function correspondenceError(code: string, message: string): CorrespondenceResult<never> {
  return { success: false, error: { code, message } };
}
