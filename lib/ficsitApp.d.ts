import { DocumentNode } from 'graphql';
import { ApolloQueryResult, FetchPolicy } from '@apollo/client/core';
/**
 * This function should be used for debugging purposes only!
 * @param enable if true enables temporary mods usage
 */
export declare function setUseTempMods(enable: boolean): void;
export declare function getUseTempMods(): boolean;
export declare function setTempModReference(modID: string, mod_reference: string): void;
export declare function addTempMod(mod: FicsitAppMod): void;
export declare function addTempModVersion(version: FicsitAppVersion): void;
export declare function removeTempMod(modReference: string): void;
export declare function removeTempModVersion(modReference: string, version: string): void;
export declare function fiscitApiQuery<T>(query: DocumentNode<unknown, unknown>, variables?: {
    [key: string]: unknown;
}, options?: {
    fetchPolicy: FetchPolicy;
}): Promise<ApolloQueryResult<T>>;
export interface FicsitAppMod {
    id: string;
    name: string;
    mod_reference: string;
    short_description: string;
    full_description: string;
    logo: string;
    source_url: string;
    views: number;
    downloads: number;
    hotness: number;
    popularity: number;
    created_at: Date;
    last_version_date: Date;
    authors: Array<FicsitAppAuthor>;
    versions: Array<FicsitAppVersion>;
}
export interface FicsitAppVersion {
    mod_id: string;
    version: string;
    sml_version: string;
    changelog: string;
    downloads: string;
    stability: 'alpha' | 'beta' | 'release';
    created_at: Date;
    link: string;
    size: number;
    hash: string;
    dependencies: FicsitAppModVersionDependency[];
}
export interface FicsitAppAuthor {
    mod_id: string;
    user: FicsitAppUser;
    role: string;
}
export interface FicsitAppUser {
    username: string;
    avatar: string;
}
export interface FicsitAppModVersionDependency {
    mod_id: string;
    condition: string;
    optional: boolean;
}
export declare function getModDownloadLink(modReference: string, version: string): Promise<string>;
export declare function getModsCount(): Promise<number>;
export declare const MODS_PER_PAGE = 50;
export declare function getAvailableMods(page: number): Promise<Array<FicsitAppMod>>;
export declare function getModReferenceFromId(modID: string): Promise<string>;
export declare function getMod(modReference: string): Promise<FicsitAppMod>;
export declare function getModName(modReference: string): Promise<string>;
export declare function getManyModVersions(modReferences: Array<string>): Promise<{
    id: string;
    mod_reference: string;
    versions: FicsitAppVersion[];
}[]>;
export declare function refetchVersions(): Promise<void>;
export declare function getModVersions(modReference: string): Promise<Array<FicsitAppVersion>>;
export declare function getModVersion(modReference: string, version: string): Promise<FicsitAppVersion>;
export declare function getModLatestVersion(modReference: string): Promise<FicsitAppVersion>;
export declare function findVersionMatchingAll(modReference: string, versionConstraints: Array<string>): Promise<string | undefined>;
export interface FicsitAppSMLVersion {
    id: string;
    version: string;
    satisfactory_version: number;
    stability: 'alpha' | 'beta' | 'release';
    link: string;
    changelog: string;
    date: Date;
    bootstrap_version: string;
}
export declare function getAvailableSMLVersions(): Promise<Array<FicsitAppSMLVersion>>;
export declare function getSMLVersion(): Promise<FicsitAppSMLVersion>;
export interface FicsitAppBootstrapperVersion {
    id: string;
    version: string;
    satisfactory_version: number;
    stability: 'alpha' | 'beta' | 'release';
    link: string;
    changelog: string;
    date: Date;
}
export declare function getAvailableBootstrapperVersions(): Promise<Array<FicsitAppBootstrapperVersion>>;
export declare function getSMLVersionInfo(version: string): Promise<FicsitAppSMLVersion | undefined>;
export declare function getLatestSMLVersion(): Promise<FicsitAppSMLVersion>;
export declare function getBootstrapperVersionInfo(version: string): Promise<FicsitAppBootstrapperVersion | undefined>;
export declare function getLatestBootstrapperVersion(): Promise<FicsitAppBootstrapperVersion>;
export declare function findAllVersionsMatchingAll(item: string, versionConstraints: Array<string>): Promise<Array<string>>;
export declare function versionExistsOnFicsitApp(id: string, version: string): Promise<boolean>;
export declare function existsOnFicsitApp(id: string): Promise<boolean>;
//# sourceMappingURL=ficsitApp.d.ts.map