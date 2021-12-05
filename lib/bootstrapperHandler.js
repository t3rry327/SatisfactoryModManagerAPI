"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uninstallBootstrapper = exports.installBootstrapper = exports.getBootstrapperVersion = exports.bootstrapperDIARelativePath = exports.bootstrapperRelativePath = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const semver_1 = require("semver");
const utils_1 = require("./utils");
const errors_1 = require("./errors");
const logging_1 = require("./logging");
const ficsitApp_1 = require("./ficsitApp");
const paths_1 = require("./paths");
const bootstrapperFileName = 'xinput1_3.dll';
const bootstrapperDIAFileName = 'msdia140.dll';
exports.bootstrapperRelativePath = path_1.default.join('FactoryGame', 'Binaries', 'Win64', bootstrapperFileName);
exports.bootstrapperDIARelativePath = path_1.default.join('FactoryGame', 'Binaries', 'Win64', bootstrapperDIAFileName);
function getBootstrapperVersion(satisfactoryPath) {
    return fs_1.default.existsSync(path_1.default.join(satisfactoryPath, exports.bootstrapperDIARelativePath))
        ? '2.0.11'
        : undefined;
}
exports.getBootstrapperVersion = getBootstrapperVersion;
async function getBootstrapperVersionCache(version) {
    var _a;
    const validVersion = semver_1.valid(semver_1.coerce(version));
    if (!validVersion) {
        throw new errors_1.ModNotFoundError(`bootstrapper@${version} not found.`, 'bootstrapper', version);
    }
    const bootstrapperVersionCacheDir = path_1.default.join(paths_1.bootstrapperCacheDir, validVersion);
    const bootstrapperCacheFile = path_1.default.join(bootstrapperVersionCacheDir, bootstrapperFileName);
    const bootstrapperCacheDIAFile = path_1.default.join(bootstrapperVersionCacheDir, bootstrapperDIAFileName);
    if (!fs_1.default.existsSync(bootstrapperVersionCacheDir)) {
        logging_1.debug(`Bootstrapper@${version} is not cached. Downloading`);
        const bootstrapperReleaseURL = (_a = (await ficsitApp_1.getBootstrapperVersionInfo(version))) === null || _a === void 0 ? void 0 : _a.link;
        if (!bootstrapperReleaseURL) {
            throw new errors_1.ModNotFoundError(`bootstrapper@${version} not found.`, 'bootstrapper', version);
        }
        const bootstrapperDownloadLink = `${bootstrapperReleaseURL.replace('/tag/', '/download/')}/${bootstrapperFileName}`;
        const bootstrapperDIADownloadLink = `${bootstrapperReleaseURL.replace('/tag/', '/download/')}/${bootstrapperDIAFileName}`;
        await utils_1.downloadFile(bootstrapperDownloadLink, bootstrapperCacheFile, 'Bootstrapper (1/2)', validVersion);
        await utils_1.downloadFile(bootstrapperDIADownloadLink, bootstrapperCacheDIAFile, 'Bootstrapper (2/2)', validVersion);
    }
    return bootstrapperVersionCacheDir;
}
async function installBootstrapper(version, satisfactoryPath) {
    if (!getBootstrapperVersion(satisfactoryPath)) {
        logging_1.debug('Installing bootstrapper');
        let bootstrapperVersionCache = await getBootstrapperVersionCache(version);
        if (!fs_1.default.existsSync(path_1.default.join(bootstrapperVersionCache, bootstrapperFileName))
            || !fs_1.default.existsSync(path_1.default.join(bootstrapperVersionCache, bootstrapperDIAFileName))) {
            utils_1.deleteFolderRecursive(bootstrapperVersionCache);
            bootstrapperVersionCache = await getBootstrapperVersionCache(version);
        }
        paths_1.ensureExists(path_1.default.dirname(path_1.default.join(satisfactoryPath, exports.bootstrapperRelativePath)));
        paths_1.ensureExists(path_1.default.dirname(path_1.default.join(satisfactoryPath, exports.bootstrapperDIARelativePath)));
        fs_1.default.copyFileSync(path_1.default.join(bootstrapperVersionCache, bootstrapperFileName), path_1.default.join(satisfactoryPath, exports.bootstrapperRelativePath));
        fs_1.default.copyFileSync(path_1.default.join(bootstrapperVersionCache, bootstrapperDIAFileName), path_1.default.join(satisfactoryPath, exports.bootstrapperDIARelativePath));
    }
    else {
        logging_1.debug('Bootstrapper is already installed');
    }
}
exports.installBootstrapper = installBootstrapper;
async function uninstallBootstrapper(satisfactoryPath) {
    const bootstrapperVersion = getBootstrapperVersion(satisfactoryPath);
    if (!bootstrapperVersion) {
        logging_1.debug('No bootstrapper to uninstall');
        return;
    }
    logging_1.debug('Uninstalling bootstrapper');
    if (fs_1.default.existsSync(path_1.default.join(satisfactoryPath, exports.bootstrapperRelativePath))) {
        fs_1.default.unlinkSync(path_1.default.join(satisfactoryPath, exports.bootstrapperRelativePath));
    }
    if (fs_1.default.existsSync(path_1.default.join(satisfactoryPath, exports.bootstrapperDIARelativePath))) {
        fs_1.default.unlinkSync(path_1.default.join(satisfactoryPath, exports.bootstrapperDIARelativePath));
    }
}
exports.uninstallBootstrapper = uninstallBootstrapper;
//# sourceMappingURL=bootstrapperHandler.js.map