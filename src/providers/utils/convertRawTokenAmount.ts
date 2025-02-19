import BigNumber from "bignumber.js";

/**
 * Converts a token amount to its formatted representation with the specified number of decimals
 * @param {string} amount - The token amount as a string
 * @param {number} decimals - The number of decimal places for the token
 * @return {string} The formatted token amount as a string
 */
export function convertRawTokenAmountToFormatted(amount: string, decimals: number): string {
  return new BigNumber(amount).dividedBy(10 ** decimals).toString();
}
