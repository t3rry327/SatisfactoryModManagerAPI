export declare class UnsolvableDependencyError extends Error {
    item: string;
    constructor(message: string, modID: string);
}
export declare class DependencyManifestMismatchError extends Error {
    item: string;
    dependants: {
        id: string;
        constraint: string;
    }[];
    constructor(message: string, item: string, depenants: {
        id: string;
        constraint: string;
    }[]);
}
export declare class InvalidLockfileOperation extends Error {
}
export declare class ModNotFoundError extends Error {
    modID: string;
    version?: string;
    constructor(message: string, modID: string, version?: string);
}
export declare class ValidationError extends Error {
    item: string;
    version?: string;
    innerError: Error;
    constructor(message: string, innerError: Error, item: string, version?: string);
}
export declare class InvalidModFileError extends Error {
}
export declare class GameRunningError extends Error {
}
export declare class InvalidProfileError extends Error {
}
export declare class IncompatibleGameVersion extends Error {
}
export declare class NetworkError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number);
}
export declare class ModRemovedByAuthor extends Error {
    item: string;
    version?: string;
    constructor(message: string, item: string, version?: string);
}
export declare class SetupError extends Error {
}
//# sourceMappingURL=errors.d.ts.map