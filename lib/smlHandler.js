"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uninstallSML = exports.installSML = exports.getModsDir = exports.getSMLVersionEnum = exports.SMLVersion = exports.getSMLVersion = exports.SML3xUPluginRelativePath = exports.SML3xRelativePath = exports.SMLPakRelativePath = exports.SMLDLLRelativePath = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const semver_1 = require("semver");
const node_stream_zip_1 = __importDefault(require("node-stream-zip"));
const utils_1 = require("./utils");
const errors_1 = require("./errors");
const logging_1 = require("./logging");
const ficsitApp_1 = require("./ficsitApp");
const paths_1 = require("./paths");
const SMLDLLFileName = 'UE4-SML-Win64-Shipping.dll';
const SMLPakFileName = 'SML.pak';
const SMLZipFileName = 'SML.smod';
exports.SMLDLLRelativePath = path_1.default.join('loaders', SMLDLLFileName);
exports.SMLPakRelativePath = path_1.default.join('loaders', SMLPakFileName);
exports.SML3xRelativePath = path_1.default.join('FactoryGame', 'Mods', 'SML');
exports.SML3xUPluginRelativePath = path_1.default.join(exports.SML3xRelativePath, 'SML.uplugin');
function getSMLVersion(satisfactoryPath) {
    // SML 3.x
    if (fs_1.default.existsSync(path_1.default.join(satisfactoryPath, exports.SML3xUPluginRelativePath))) {
        const uplugin = JSON.parse(fs_1.default.readFileSync(path_1.default.join(satisfactoryPath, exports.SML3xUPluginRelativePath), { encoding: 'utf8' }));
        return uplugin.SemVersion || semver_1.valid(uplugin.VersionName) || `${uplugin.Version}.0.0`;
    }
    if (fs_1.default.existsSync(path_1.default.join(satisfactoryPath, exports.SMLDLLRelativePath))) {
        // SML 2.x
        return '2.2.1';
    }
    return undefined;
}
exports.getSMLVersion = getSMLVersion;
var SMLVersion;
(function (SMLVersion) {
    SMLVersion[SMLVersion["v2_x"] = 0] = "v2_x";
    SMLVersion[SMLVersion["v3_x"] = 1] = "v3_x";
})(SMLVersion = exports.SMLVersion || (exports.SMLVersion = {}));
function getSMLVersionEnum(satisfactoryPath) {
    return semver_1.satisfies(getSMLVersion(satisfactoryPath) || '0.0.0', '>=3.0.0') ? SMLVersion.v3_x : SMLVersion.v2_x;
}
exports.getSMLVersionEnum = getSMLVersionEnum;
function getModsDir(satisfactoryPath) {
    const smlVersion = getSMLVersion(satisfactoryPath) || '0.0.0';
    if (semver_1.satisfies(smlVersion, '>=3.0.0')) {
        return path_1.default.join(satisfactoryPath, 'FactoryGame', 'Mods');
    }
    return path_1.default.join(satisfactoryPath, 'mods');
}
exports.getModsDir = getModsDir;
async function getSMLVersionCache(version) {
    var _a, _b;
    const validVersion = semver_1.valid(semver_1.coerce(version));
    if (!validVersion) {
        throw new errors_1.ModNotFoundError(`SML@${version} not found.`, 'SML', version);
    }
    const smlVersionCacheDir = path_1.default.join(paths_1.smlCacheDir, validVersion);
    if (semver_1.satisfies(validVersion, '>=3.0.0')) {
        const smlZipCacheFile = path_1.default.join(smlVersionCacheDir, SMLZipFileName);
        if (!fs_1.default.existsSync(smlZipCacheFile) || !await utils_1.isValidZip(smlZipCacheFile)) {
            logging_1.debug(`SML@${version} is not cached. Downloading`);
            const smlReleaseURL = (_a = (await ficsitApp_1.getSMLVersionInfo(version))) === null || _a === void 0 ? void 0 : _a.link;
            if (!smlReleaseURL) {
                throw new errors_1.ModNotFoundError(`SML@${version} not found.`, 'SML', version);
            }
            const smlZipDownloadLink = `${smlReleaseURL.replace('/tag/', '/download/')}/SML.zip`;
            await utils_1.downloadFile(smlZipDownloadLink, smlZipCacheFile, 'SML', validVersion);
        }
    }
    else {
        const smlDLLVerionCacheFile = path_1.default.join(smlVersionCacheDir, SMLDLLFileName);
        const smlPakVerionCacheFile = path_1.default.join(smlVersionCacheDir, SMLPakFileName);
        if (!fs_1.default.existsSync(smlVersionCacheDir)) {
            logging_1.debug(`SML@${version} is not cached. Downloading`);
            const smlReleaseURL = (_b = (await ficsitApp_1.getSMLVersionInfo(version))) === null || _b === void 0 ? void 0 : _b.link;
            if (!smlReleaseURL) {
                throw new errors_1.ModNotFoundError(`SML@${version} not found.`, 'SML', version);
            }
            const smlDLLDownloadLink = `${smlReleaseURL.replace('/tag/', '/download/')}/${SMLDLLFileName}`;
            const smlPakDownloadLink = `${smlReleaseURL.replace('/tag/', '/download/')}/${SMLPakFileName}`;
            let hasPak = true;
            try {
                await utils_1.downloadFile(smlPakDownloadLink, smlPakVerionCacheFile, 'SML (1/2)', validVersion);
            }
            catch (e) {
                hasPak = false;
                logging_1.debug(`Pak of SML version ${version} not found.`);
            }
            await utils_1.downloadFile(smlDLLDownloadLink, smlDLLVerionCacheFile, `SML ${hasPak ? '(2/2)' : '(1/1)'}`, validVersion);
        }
    }
    return smlVersionCacheDir;
}
async function installSML(version, satisfactoryPath) {
    if (!getSMLVersion(satisfactoryPath)) {
        logging_1.debug(`Installing SML@${version}`);
        const smlVersionCache = await getSMLVersionCache(version);
        if (semver_1.satisfies(version, '>=3.0.0')) {
            const extractPath = path_1.default.join(satisfactoryPath, exports.SML3xRelativePath);
            // eslint-disable-next-line new-cap
            const zipData = new node_stream_zip_1.default.async({ file: path_1.default.join(smlVersionCache, SMLZipFileName) });
            paths_1.ensureExists(extractPath);
            await zipData.extract(null, extractPath);
            await zipData.close();
        }
        else {
            paths_1.ensureExists(path_1.default.dirname(path_1.default.join(satisfactoryPath, exports.SMLDLLRelativePath)));
            paths_1.ensureExists(path_1.default.dirname(path_1.default.join(satisfactoryPath, exports.SMLPakRelativePath)));
            fs_1.default.copyFileSync(path_1.default.join(smlVersionCache, SMLDLLFileName), path_1.default.join(satisfactoryPath, exports.SMLDLLRelativePath));
            if (fs_1.default.existsSync(path_1.default.join(smlVersionCache, SMLPakFileName))) {
                fs_1.default.copyFileSync(path_1.default.join(smlVersionCache, SMLPakFileName), path_1.default.join(satisfactoryPath, exports.SMLPakRelativePath));
            }
        }
    }
    else {
        logging_1.debug('SML is already installed');
    }
}
exports.installSML = installSML;
async function uninstallSML(satisfactoryPath) {
    const smlVersion = getSMLVersion(satisfactoryPath);
    if (!smlVersion) {
        logging_1.debug('No SML to uninstall');
        return;
    }
    logging_1.debug('Uninstalling SML');
    if (semver_1.satisfies(getSMLVersion(satisfactoryPath) || '0.0.0', '>=3.0.0')) {
        const smlPath = path_1.default.join(satisfactoryPath, exports.SML3xRelativePath);
        fs_1.default.rmdirSync(smlPath, { recursive: true });
    }
    else {
        if (fs_1.default.existsSync(path_1.default.join(satisfactoryPath, exports.SMLDLLRelativePath))) {
            fs_1.default.unlinkSync(path_1.default.join(satisfactoryPath, exports.SMLDLLRelativePath));
        }
        if (fs_1.default.existsSync(path_1.default.join(satisfactoryPath, exports.SMLPakRelativePath))) {
            fs_1.default.unlinkSync(path_1.default.join(satisfactoryPath, exports.SMLPakRelativePath));
        }
    }
}
exports.uninstallSML = uninstallSML;
//# sourceMappingURL=smlHandler.js.map