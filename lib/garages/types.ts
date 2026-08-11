export type GarageError = { code: string; message: string };
export type GarageResult<T> = { success: true; data: T } | { success: false; error: GarageError };

export function garageError(code: string, message: string): GarageResult<never> {
  return { success: false, error: { code, message } };
}
