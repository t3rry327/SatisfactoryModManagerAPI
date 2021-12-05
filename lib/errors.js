"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetupError = exports.ModRemovedByAuthor = exports.NetworkError = exports.IncompatibleGameVersion = exports.InvalidProfileError = exports.GameRunningError = exports.InvalidModFileError = exports.ValidationError = exports.ModNotFoundError = exports.InvalidLockfileOperation = exports.DependencyManifestMismatchError = exports.UnsolvableDependencyError = void 0;
/* eslint-disable max-classes-per-file */
class UnsolvableDependencyError extends Error {
    constructor(message, modID) {
        super(message);
        this.item = modID;
    }
}
exports.UnsolvableDependencyError = UnsolvableDependencyError;
class DependencyManifestMismatchError extends Error {
    constructor(message, item, depenants) {
        super(message);
        this.item = item;
        this.dependants = depenants;
    }
}
exports.DependencyManifestMismatchError = DependencyManifestMismatchError;
class InvalidLockfileOperation extends Error {
}
exports.InvalidLockfileOperation = InvalidLockfileOperation;
class ModNotFoundError extends Error {
    constructor(message, modID, version) {
        super(message);
        this.modID = modID;
        this.version = version;
    }
}
exports.ModNotFoundError = ModNotFoundError;
class ValidationError extends Error {
    constructor(message, innerError, item, version) {
        super(message);
        this.item = item;
        this.version = version;
        this.innerError = innerError;
    }
}
exports.ValidationError = ValidationError;
class InvalidModFileError extends Error {
}
exports.InvalidModFileError = InvalidModFileError;
class GameRunningError extends Error {
}
exports.GameRunningError = GameRunningError;
class InvalidProfileError extends Error {
}
exports.InvalidProfileError = InvalidProfileError;
class IncompatibleGameVersion extends Error {
}
exports.IncompatibleGameVersion = IncompatibleGameVersion;
class NetworkError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}
exports.NetworkError = NetworkError;
class ModRemovedByAuthor extends Error {
    constructor(message, item, version) {
        super(message);
        this.item = item;
        this.version = version;
    }
}
exports.ModRemovedByAuthor = ModRemovedByAuthor;
class SetupError extends Error {
}
exports.SetupError = SetupError;
//# sourceMappingURL=errors.js.map