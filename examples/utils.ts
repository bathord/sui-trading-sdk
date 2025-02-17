import * as fs from "fs";

/**
 * Add two numbers.
 * @param {string} hexStr String as an input.
 * @return {Uint8Array} Encoded string into Uint8Array type.
 */
export function hexStringToUint8Array(hexStr: string) {
  if (hexStr.length % 2 !== 0) {
    throw new Error("Invalid hex string length.");
  }

  const byteValues: number[] = [];

  for (let i = 0; i < hexStr.length; i += 2) {
    const byte: number = parseInt(hexStr.slice(i, i + 2), 16);

    if (Number.isNaN(byte)) {
      throw new Error(`Invalid hex value at position ${i}: ${hexStr.slice(i, i + 2)}`);
    }

    byteValues.push(byte);
  }

  return new Uint8Array(byteValues);
}
/**
 * Save data to a JSON file with formatted content.
 *
 * @async
 * @function
 * @param {object | object[]} data - The data to be saved to the JSON file.
 * @param {string} filename - The name of the JSON file (excluding the file extension).
 * @return {Promise<void>} A Promise that resolves when the data is successfully saved.
 * @throws {Error} Throws an error if there is an issue saving the data to the file.
 *
 * @example
 * // Assuming retrievelAllPools returns an object or array of data
 * const cetusPools = await retrievelAllPools();
 * await saveDataToJsonFile(cetusPools, 'cetusPools');
 */
export async function saveDataToJsonFile(data: object | object[], filename: string): Promise<void> {
  try {
    const jsonData: string = JSON.stringify(data, null, 2);
    const filePath = `${__dirname}/${filename}.json`;

    await fs.promises.writeFile(filePath, jsonData);

    console.log(`Data has been saved to ${filename}.json`);
  } catch (error) {
    console.error("Error saving data to file:", error);
  }
}

/**
 * Generic function to convert Map to plain object.
 *
 * @template T - The type of the values in the map.
 * @param {Map<string, T>} map - The map to be converted.
 * @return {Record<string, T>} - The resulting plain object.
 */
export function mapToObject<T>(map: Map<string, T>): Record<string, T> {
  const obj: Record<string, T> = {};
  map.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

type MyMapType<T> = Map<string, Map<string, T>>;

/**
 * Generic function to convert MyMapType to Record.
 *
 * @template T - The type of the values in the inner map.
 * @param {MyMapType<T>} data - The MyMapType to be converted.
 * @return {Record<string, Record<string, T>>} - The resulting Record.
 */
export function convertMyMapTypeToRecord<T>(data: MyMapType<T>): Record<string, Record<string, T>> {
  const result: Record<string, Record<string, T>> = {};
  data.forEach((innerMap, key) => {
    result[key] = mapToObject(innerMap);
  });
  return result;
}

/**
 * Reads data from a JSON file asynchronously.
 * @param {string} filename - The name of the JSON file to read.
 * @return {Promise<object | object[]>} A promise that resolves with the parsed JSON data.
 */
export async function readDataFromJsonFile(filename: string): Promise<object | object[] | null> {
  try {
    const filePath = `${__dirname}/${filename}.json`;
    const jsonData: string = await fs.promises.readFile(filePath, "utf-8");
    return JSON.parse(jsonData);
  } catch (error) {
    console.error("Error reading data from file:", error);
    return null;
  }
}

/**
 * Returns the current date and time in "dd.mm.yyyy hh:mm:ss.mmm" format.
 * @return {string} Formatted date-time string.
 */
export function getCurrentDateTime(): string {
  const now = new Date();

  // Get date components
  const day = now.getDate().toString().padStart(2, "0");
  const month = (now.getMonth() + 1).toString().padStart(2, "0"); // Months are 0-based
  const year = now.getFullYear();

  // Get time components
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  const milliseconds = now.getMilliseconds().toString().padStart(3, "0");

  // Combine into desired format
  return `[${hours}:${minutes}:${seconds}.${milliseconds} ${day}.${month}.${year}]`;
}
