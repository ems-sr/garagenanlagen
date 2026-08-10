export type BillingError = { code: string; message: string };
export type BillingResult<T> = { success: true; data: T } | { success: false; error: BillingError };

export function billingError(code: string, message: string): BillingResult<never> {
  return { success: false, error: { code, message } };
}
