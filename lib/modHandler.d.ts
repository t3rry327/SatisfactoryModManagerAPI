import { SMLVersion } from './smlHandler';
export declare function getModFromFile(modPath: string): Promise<Mod | undefined>;
export declare function addModToCache(modFile: string): Promise<Mod | undefined>;
export declare function loadCache(): Promise<void>;
export declare function downloadMod(modReference: string, version: string, attempt?: number): Promise<string>;
export declare function getCachedMods(): Promise<Array<Mod>>;
export declare function getCachedMod(modReference: string, version: string): Promise<Mod | undefined>;
export declare function getCachedModVersions(modReference: string): Promise<string[]>;
export declare function removeModFromCache(modReference: string, version: string): Promise<void>;
export interface Mod {
    mod_id: string;
    mod_reference: string;
    name: string;
    version: string;
    description: string;
    authors: Array<string>;
    objects: Array<ModObject>;
    dependencies?: {
        [modReference: string]: string;
    };
    optional_dependencies?: {
        [modReference: string]: string;
    };
    path?: string;
    sml_version?: string;
}
export interface ModObject {
    path: string;
    type: string;
}
export declare function installMod(modReference: string, version: string, modsDir: string, smlVersion: SMLVersion): Promise<void>;
export declare function uninstallMods(modReferences: Array<string>, modsDir: string, smlVersion: SMLVersion): Promise<void>;
export declare function getInstalledMods(modsDir: string | undefined, smlVersion: SMLVersion): Promise<Array<Mod>>;
export declare function clearCache(): void;
//# sourceMappingURL=modHandler.d.ts.map