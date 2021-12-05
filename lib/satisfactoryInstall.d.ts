import { FicsitAppVersion, FicsitAppSMLVersion, FicsitAppBootstrapperVersion } from './ficsitApp';
import { ManifestItem, Manifest } from './manifest';
import { ItemVersionList, Lockfile } from './lockfile';
export declare function getProfileFolderPath(profileName: string): string;
export declare function profileExists(profileName: string): boolean;
export interface ItemUpdate {
    item: string;
    currentVersion: string;
    version: string;
    releases: Array<FicsitAppVersion | FicsitAppSMLVersion | FicsitAppBootstrapperVersion>;
}
export interface ProfileMetadata {
    gameVersion: string;
}
export declare class SatisfactoryInstall {
    name: string;
    version: string;
    branch: string;
    installLocation: string;
    launchPath?: string;
    setup?: () => Promise<void>;
    private _profile;
    constructor(name: string, version: string, branch: string, installLocation: string, launchPath?: string, setup?: () => Promise<void>);
    private _getInstalledMismatches;
    validateInstall(items: ItemVersionList): Promise<void>;
    manifestMutate(install: Array<ManifestItem>, uninstall: Array<string>, enable: Array<string>, disable: Array<string>, update: Array<string>): Promise<void>;
    setProfile(profileName: string): Promise<void>;
    get profile(): string;
    _installItem(id: string, version?: string): Promise<void>;
    _uninstallItem(item: string): Promise<void>;
    _enableItem(item: string): Promise<void>;
    _disableItem(item: string): Promise<void>;
    _updateItem(item: string): Promise<void>;
    installMod(modReference: string, version?: string): Promise<void>;
    uninstallMod(modReference: string): Promise<void>;
    enableMod(modReference: string): Promise<void>;
    disableMod(modReference: string): Promise<void>;
    updateMod(modReference: string): Promise<void>;
    private _getInstalledMods;
    get mods(): ItemVersionList;
    get manifestMods(): ManifestItem[];
    installSML(version?: string): Promise<void>;
    uninstallSML(): Promise<void>;
    updateSML(): Promise<void>;
    private _getInstalledSMLVersion;
    get smlVersion(): string | undefined;
    get manifestSML(): ManifestItem | undefined;
    updateBootstrapper(): Promise<void>;
    clearCache(): Promise<void>;
    checkForUpdates(): Promise<Array<ItemUpdate>>;
    importProfile(filePath: string, profileName: string, includeVersions?: boolean): Promise<void>;
    exportProfile(filePath: string): Promise<void>;
    static isGameRunning(): Promise<boolean>;
    get bootstrapperVersion(): string | undefined;
    private _getInstalledBootstrapperVersion;
    private get _itemsList();
    get binariesDir(): string;
    get displayName(): string;
    get modsDir(): string;
    get profileManifest(): string;
    get profileLockfile(): string;
    get lockfileName(): string;
    readManifest(): Manifest;
    readLockfile(): Lockfile;
}
export declare function getProfiles(): Array<{
    name: string;
    items: ManifestItem[];
}>;
export declare function deleteProfile(name: string): void;
export declare function createProfile(name: string, copyProfile?: string): void;
export declare function renameProfile(oldName: string, newName: string): void;
//# sourceMappingURL=satisfactoryInstall.d.ts.map