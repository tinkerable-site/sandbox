import { FetchError } from '../errors/FetchError';
import { sleep } from './sleep';
import {inflate} from 'pako';
import {basename} from '../utils/path'
import parseTar from 'parse-tar';

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
}

export type RequestInitWithRetry = RequestInit & RetryOptions;

// 408 is timeout
// 429 is too many requests
// 424 is failed dependency
// 499 is client closed connection
// 444 is connection closed without response
// 502 is Bad gateway
// 503 is Service Unavailable
// 504 is Gateway Timeout
// 599 is Network Connect Timeout Error
const ERROR_CODES_TO_RETRY = new Set([408, 429, 424, 499, 444, 502, 503, 504, 599]);
function isRetryableStatus(status: number): boolean {
  return ERROR_CODES_TO_RETRY.has(status);
}

const responseCache:Map<string, () => Response> = new Map();

export const loadCachedResponses = async (url:string):Promise<number> => {
  try {
    const response = await retryFetch(url);
    const compressed = await response.arrayBuffer(); // Download gzipped tar file and get ArrayBuffer
    const inflated = await inflate(compressed);             // Decompress gzip using pako
    const inflatedBuffer = await inflated.buffer;     // Get ArrayBuffer from the Uint8Array pako returns
    const files = parseTar(inflatedBuffer);                  // Untar
    // read manifest
    const manifestFile = files.filter(f => basename(f.name) == 'manifest.json');
    if (manifestFile.length !== 1) {
      throw new Error("Could not find cache responses manifest file in tarball");
    }
    const manifest = JSON.parse(new TextDecoder().decode(manifestFile[0].contents)) as Record<string, string>;
    let urlsCached = 0;
    for (let file of files) {
      const hash = basename(file.name);
      const url = manifest[hash];
      if (url) {
        responseCache.set(url, () => new Response(new Blob([file.contents!]), { status: 200 }))
      }
      urlsCached++;
    }
    return urlsCached;
  } catch (e) {
    console.error(e);
    return 0;
  }
}

/**
 * Fetches a resource using the provided config and retries if it fails with a network or server availability error
 *
 * @param {RequestInfo} input: request info for fetch
 * @param {RequestInit} init: request options for fetch
 * @param {pRetry.PromiseRetryOptions} retryOptions: Retry configuration
 * @returns {Response}
 */
export async function retryFetch(input: RequestInfo, init: RequestInitWithRetry = {}, count = 0): Promise<Response> {
  if (typeof input === 'string') {
    const responder = responseCache.get(input);
    if (responder) {
      return responder();
    }
  }
  const { maxRetries = 0, retryDelay = 500 } = init;
  if (count > maxRetries) {
    throw new Error('Fetch failed, maximum retries exceeded');
  }
  const shouldRetry = count < maxRetries;
  try {
    const result = await window.fetch(input, init);
    if (result.ok) {
      return result;
    }
    // Don't use p-retry it cannot be scope hoisted properly
    // See https://github.com/parcel-bundler/parcel/issues/7866
    const isRetryable = isRetryableStatus(result.status);
    if (!shouldRetry || !isRetryable) {
      const text = await result.text().catch(() => '');
      throw new FetchError(result, text);
    }
  } catch (err) {
    if (!shouldRetry) {
      throw err;
    }
  }
  await sleep(retryDelay);
  return retryFetch(input, init, count + 1);
}
