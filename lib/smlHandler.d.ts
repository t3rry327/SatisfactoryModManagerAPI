export declare const SMLDLLRelativePath: string;
export declare const SMLPakRelativePath: string;
export declare const SML3xRelativePath: string;
export declare const SML3xUPluginRelativePath: string;
export declare function getSMLVersion(satisfactoryPath: string): string | undefined;
export declare enum SMLVersion {
    'v2_x' = 0,
    'v3_x' = 1
}
export declare function getSMLVersionEnum(satisfactoryPath: string): SMLVersion;
export declare function getModsDir(satisfactoryPath: string): string;
export declare function installSML(version: string, satisfactoryPath: string): Promise<void>;
export declare function uninstallSML(satisfactoryPath: string): Promise<void>;
//# sourceMappingURL=smlHandler.d.ts.map