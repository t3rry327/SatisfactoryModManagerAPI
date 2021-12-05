import { Progress } from 'got';
import 'win-ca';
export declare const SMLID = "SML";
export declare const BootstrapperID = "bootstrapper";
export declare const minSMLVersion = "2.0.0";
export declare function isDebug(): boolean;
export declare function setDebug(shouldDebug: boolean): void;
export declare function toggleDebug(): void;
export declare function dirs(p: string): Array<string>;
export declare function deleteFolderRecursive(deletePath: string): void;
export declare function clearCache(): void;
export declare function clearOutdatedCache(): void;
export declare function copyFile(file: string, toDir: string): void;
export declare function isValidZip(file: string): Promise<boolean>;
export declare const UserAgent: string;
declare type ProgressCallback = (url: string, progress: Progress, name: string, version: string, elapsedTime: number) => void;
export declare function addDownloadProgressCallback(cb: ProgressCallback): void;
export declare function downloadFile(url: string, file: string, name: string, version: string): Promise<void>;
export declare function versionSatisfiesAll(version: string, versionConstraints: Array<string>): boolean;
export declare function validAndGreater(v1: string, v2: string): boolean;
export declare function filterObject<V>(object: {
    [key: string]: V;
}, filterFunction: (key: string, value: V) => boolean): {
    [key: string]: V;
};
export declare function mapObject<U, V>(object: {
    [key: string]: U;
}, mapFunction: (key: string, value: U) => [string, V]): {
    [key: string]: V;
};
export declare function mergeArrays<T>(...arrays: Array<Array<T>>): Array<T>;
export declare function isRunning(command: string, strict?: boolean): Promise<boolean>;
export declare function hashString(s: string): string;
export declare function hashFile(filePath: string): string;
export declare function unique<T>(value: T, index: number, self: T[]): boolean;
export {};
//# sourceMappingURL=utils.d.ts.map