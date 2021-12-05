export interface ManifestItem {
    id: string;
    version?: string;
    enabled: boolean;
}
export interface Manifest {
    manifestVersion: ManifestVersion;
    items: Array<ManifestItem>;
}
export declare enum ManifestVersion {
    AddedManifestVersions = 0,
    RemovedGameVersion = 1,
    AddedEnabled = 2,
    LatestPlusOne = 3,
    Latest = 2
}
export declare function mutateManifest(currentManifest: Manifest, install: Array<ManifestItem>, uninstall: Array<string>, enable: Array<string>, disable: Array<string>, update: Array<string>): Promise<Manifest>;
export declare function readManifest(filePath: string): Manifest;
export declare function writeManifest(filePath: string, manifest: Manifest): void;
//# sourceMappingURL=manifest.d.ts.map