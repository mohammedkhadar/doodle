/** Normalize unknown thrown values for UI error strings. */
export function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
