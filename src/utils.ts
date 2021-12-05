import path from 'path';
import fs from 'fs';
import { satisfies, coerce, gt } from 'semver';
import psList from 'ps-list';
import { execSync } from 'child_process';
import got, { HTTPError, Progress } from 'got';
import { createHash } from 'crypto';
import stream from 'stream';
import { promisify } from 'util';
import StreamZip from 'node-stream-zip';
import {
  setLogDebug, debug,
} from './logging';
import { NetworkError } from './errors';
import {
  ensureExists, bootstrapperCacheDir, smlCacheDir, modCacheDir,
} from './paths';
import 'win-ca';

const pipeline = promisify(stream.pipeline);

export const SMLID = 'SML';
export const BootstrapperID = 'bootstrapper';
export const minSMLVersion = '2.0.0';

let isDebugMode = process.env.NODE_DEBUG?.includes('SMManagerAPI') || false;

setLogDebug(isDebugMode);

export function isDebug(): boolean {
  return isDebugMode;
}

export function setDebug(shouldDebug: boolean): void {
  isDebugMode = shouldDebug;
  setLogDebug(shouldDebug);
}

export function toggleDebug(): void {
  setDebug(!isDebugMode);
}

export function dirs(p: string): Array<string> {
  if (fs.existsSync(p)) {
    return fs.readdirSync(p).filter((f) => fs.statSync(path.join(p, f)).isDirectory());
  }
  return [];
}

export function deleteFolderRecursive(deletePath: string): void {
  if (fs.existsSync(deletePath)) {
    fs.readdirSync(deletePath).forEach((file) => {
      const curPath = path.join(deletePath, file);
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(deletePath);
  }
}

export function clearCache(): void {
  fs.readdirSync(modCacheDir).forEach((file) => {
    const curPath = path.join(modCacheDir, file);
    if (fs.statSync(curPath).isDirectory()) {
      deleteFolderRecursive(curPath);
    } else {
      fs.unlinkSync(curPath);
    }
  });
  fs.readdirSync(smlCacheDir).forEach((file) => {
    const curPath = path.join(smlCacheDir, file);
    if (fs.statSync(curPath).isDirectory()) {
      deleteFolderRecursive(curPath);
    } else {
      fs.unlinkSync(curPath);
    }
  });
  fs.readdirSync(bootstrapperCacheDir).forEach((file) => {
    const curPath = path.join(bootstrapperCacheDir, file);
    if (fs.statSync(curPath).isDirectory()) {
      deleteFolderRecursive(curPath);
    } else {
      fs.unlinkSync(curPath);
    }
  });
}

const CACHE_LIFETIME = 30 * 24 * 60 * 60 * 1000; // 30 days

export function clearOutdatedCache(): void {
  const now = new Date();
  fs.readdirSync(modCacheDir).forEach((file) => {
    const curPath = path.join(modCacheDir, file);
    if (now.getTime() - fs.statSync(curPath).mtime.getTime() >= CACHE_LIFETIME) {
      if (fs.statSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    }
  });
  fs.readdirSync(smlCacheDir).forEach((file) => {
    const curPath = path.join(smlCacheDir, file);
    if (now.getTime() - fs.statSync(curPath).mtime.getTime() >= CACHE_LIFETIME) {
      if (fs.statSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    }
  });
  fs.readdirSync(bootstrapperCacheDir).forEach((file) => {
    const curPath = path.join(bootstrapperCacheDir, file);
    if (now.getTime() - fs.statSync(curPath).mtime.getTime() >= CACHE_LIFETIME) {
      if (fs.statSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    }
  });
}

export function copyFile(file: string, toDir: string): void {
  ensureExists(toDir);
  fs.copyFileSync(file, path.join(toDir, path.basename(file)));
}

export async function isValidZip(file: string): Promise<boolean> {
  try {
    // eslint-disable-next-line new-cap
    const zipData = new StreamZip.async({ file });
    await zipData.entries();
    await zipData.close();
    return true;
  } catch (e) {
    return false;
  }
}

export const UserAgent = `${process.env.SMM_API_USERAGENT?.replace(' ', '') || 'SatisfactoryModManagerAPI'}/${process.env.SMM_API_USERAGENT_VERSION || 'unknown'}`;

const DOWNLOAD_ATTEMPTS = 3;
const DOWNLOAD_TIMEOUT = 30 * 1000;

type ProgressCallback = (url: string, progress: Progress, name: string, version: string, elapsedTime: number) => void;
const progressCallbacks: Array<ProgressCallback> = [];

export function addDownloadProgressCallback(cb: ProgressCallback): void {
  if (!progressCallbacks.includes(cb)) {
    progressCallbacks.push(cb);
  }
}

export async function downloadFile(url: string, file: string, name: string, version: string): Promise<void> {
  let interval: NodeJS.Timeout | undefined;
  try {
    ensureExists(path.dirname(file));
    const startTime = Date.now();
    let lastProgressTime = Date.now() + DOWNLOAD_TIMEOUT; // give some time to resolve the url and stuff
    const req = got.stream(url, {
      retry: {
        limit: DOWNLOAD_ATTEMPTS,
      },
      dnsCache: false,
      headers: {
        'User-Agent': UserAgent,
      },
    });
    req.on('downloadProgress', (progress) => {
      if (progress.total) {
        progressCallbacks.forEach(async (cb) => cb(url, progress, name, version, Date.now() - startTime));
      }
      lastProgressTime = Date.now();
    });
    interval = setInterval(() => {
      if (Date.now() - lastProgressTime >= DOWNLOAD_TIMEOUT) {
        req.destroy();
      }
    }, 100);
    await pipeline(req, fs.createWriteStream(file));
    clearInterval(interval);
    return;
  } catch (e) {
    if (interval) {
      clearInterval(interval);
    }
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
    if (e instanceof got.CancelError) {
      debug(`Timed out downloading ${url}.`);
      throw new NetworkError(`Timed out downloading ${url}.`, 408);
    }
    if (e.name === 'HTTPError') {
      debug(`Network error while downloading file ${url}: ${e.message}. Trace:\n${e.stack}`);
      throw new NetworkError(`Could not download file (${e.message}). Please try again later.`, (e as HTTPError).response.statusCode);
    }
    debug(`Unexpected error while downloading ${url}: ${e.message}. Trace:\n${e.stack}`);
    throw new Error(`Unexpected error while downloading file ${url}: ${e.message}. Trace:\n${e.stack}`);
  }
}

// eslint-disable-next-line no-extend-native
Array.prototype.forEachAsync = async function forEachAsync<T>(callback: {(value: T, index: number, array: Array<T>): Promise<void>}): Promise<void> {
  for (let i = 0; i < this.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await callback(this[i], i, this);
  }
};

// eslint-disable-next-line no-extend-native
Array.prototype.remove = function remove<T>(element: T): void {
  const index = this.indexOf(element);
  if (index !== -1) {
    this.splice(index, 1);
  }
};

// eslint-disable-next-line no-extend-native
Array.prototype.removeWhere = function removeWhere<T>(predicate: (value: T, index: number, array: Array<T>) => boolean): void {
  const toRemove = new Array<T>();
  this.forEach((value, index, array) => {
    if (predicate(value, index, array)) {
      toRemove.push(value);
    }
  });
  toRemove.forEach((element) => {
    this.remove(element);
  });
};

// eslint-disable-next-line no-extend-native, max-len
Array.prototype.removeWhereAsync = async function removeWhereAsync<T>(predicate: (value: T, index: number, array: Array<T>) => Promise<boolean>): Promise<void> {
  const toRemove = new Array<T>();
  await Promise.all(this.map(async (value, index, array) => {
    if (await predicate(value, index, array)) {
      toRemove.push(value);
    }
  }));
  toRemove.forEach((element) => {
    this.remove(element);
  });
};

// eslint-disable-next-line no-extend-native, max-len
Array.prototype.filterAsync = async function filterAsync<T>(predicate: (value: T, index: number, array: Array<T>) => Promise<boolean>): Promise<Array<T>> {
  const results = await Promise.all(this.map(predicate));

  return this.filter((_v, index) => results[index]);
};

export function versionSatisfiesAll(version: string, versionConstraints: Array<string>): boolean {
  return versionConstraints.every((versionConstraint) => satisfies(version, versionConstraint));
}

export function validAndGreater(v1: string, v2: string): boolean {
  const fixedV1 = coerce(v1);
  const fixedV2 = coerce(v2);
  if (!fixedV1 || !fixedV2) return false;
  return gt(fixedV1, fixedV2);
}

export function filterObject<V>(object: { [key: string]: V },
  filterFunction: (key: string, value: V) => boolean): { [key: string]: V } {
  const filtered: { [key: string]: V } = {};
  Object.entries(object).filter((entry) => filterFunction(entry[0], entry[1])).forEach((entry) => {
    const key = entry[0];
    const val = entry[1];
    filtered[key] = val;
  });
  return filtered;
}

export function mapObject<U, V>(object: { [key: string]: U },
  mapFunction: (key: string, value: U) => [string, V]): { [key: string]: V } {
  const mapped: { [key: string]: V } = {};
  Object.entries(object).map((entry) => mapFunction(entry[0], entry[1])).forEach((entry) => {
    const key = entry[0];
    const val = entry[1];
    mapped[key] = val;
  });
  return mapped;
}

export function mergeArrays<T>(...arrays: Array<Array<T>>): Array<T> {
  let jointArray: Array<T> = [];

  arrays.forEach((array) => {
    jointArray = [...jointArray, ...array];
  });
  const uniqueArray = jointArray.filter((item, index) => jointArray.indexOf(item) === index);
  return uniqueArray;
}

export async function isRunning(command: string, strict = false): Promise<boolean> {
  try {
    // manual is now main to handle ghost instances
    let cmd = '';
    switch (process.platform) {
      case 'win32': cmd = `wmic process where (caption="${command}" and handlecount!="0") get commandline`; break;
      case 'darwin': cmd = `ps -ax | grep ${command}`; break;
      case 'linux': cmd = `ps -A | grep ${command}`; break;
      default: break;
    }
    const runningInstances = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return runningInstances.toLowerCase().indexOf(command.toLowerCase()) > -1;
  } catch (e) {
    // fallback to psList
    let runningInstances = [];
    if (process.platform === 'win32' || strict) {
      runningInstances = (await psList()).filter((process) => process.name?.includes(command));
    } else {
      runningInstances = (await psList()).filter((process) => process.cmd?.includes(command));
    }

    return runningInstances.length > 0;
  }
}

export function hashString(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

export function hashFile(filePath: string): string {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

export function unique<T>(value: T, index: number, self: T[]): boolean {
  return self.indexOf(value) === index;
}
