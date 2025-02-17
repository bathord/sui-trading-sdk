/**
 * Custom error class representing a timeout error during operation execution.
 * @class
 * @extends Error
 */
export class TimeoutError extends Error {
  /**
   * Creates an instance of TimeoutError.
   * @constructor
   * @param {string} msg - The error message.
   */
  constructor(msg: string) {
    super(msg);
  }
}
