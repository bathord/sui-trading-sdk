import { TimeoutError } from "../../errors/TimeoutError";

/**
 * Executes a promise with a timeout
 * @template T
 * @param {function(): Promise<T>} operation The operation to execute
 * @param {number} timeoutMs Timeout in milliseconds
 * @param {string} providerName Provider name for error message
 * @param {string} operationName Operation name for error message
 * @return {Promise<T>} A Promise that resolves with the operation result or rejects on timeout
 */
export async function executeWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  providerName: string,
  operationName: string,
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(`[${providerName}] ${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}
