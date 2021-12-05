import { Manifest } from './manifest';
export interface ItemVersionList {
    [id: string]: string;
}
export interface LockfileGraphNode {
    id: string;
    version: string;
    dependencies: ItemVersionList;
}
export interface Lockfile {
    [id: string]: LockfileItemData;
}
export interface LockfileItemData {
    version: string;
    dependencies: ItemVersionList;
}
export declare function getItemData(id: string, version: string): Promise<LockfileGraphNode>;
export declare function getFriendlyItemName(id: string): Promise<string>;
export declare class LockfileGraph {
    nodes: LockfileGraphNode[];
    fromLockfile(lockfile: Lockfile): Promise<void>;
    validate(dependency: string): Promise<void>;
    toLockfile(): Lockfile;
    findById(id: string): LockfileGraphNode | undefined;
    roots(): Array<LockfileGraphNode>;
    getDependants(node: string): Array<LockfileGraphNode>;
    remove(node: LockfileGraphNode): void;
    removeWhere(cb: (node: LockfileGraphNode) => boolean): void;
    add(node: LockfileGraphNode): Promise<void>;
    static isInManifest(node: LockfileGraphNode): boolean;
    isNodeDangling(node: LockfileGraphNode): boolean;
    private get _danglingCount();
    cleanup(): void;
}
export declare function computeLockfile(manifest: Manifest, lockfile: Lockfile, satisfactoryVersion: string, update: Array<string>): Promise<Lockfile>;
export declare function readLockfile(filePath: string): Lockfile;
export declare function writeLockfile(filePath: string, lockfile: Lockfile): void;
export declare function getItemsList(lockfile: Lockfile): ItemVersionList;
//# sourceMappingURL=lockfile.d.ts.map