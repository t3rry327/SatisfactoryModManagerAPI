"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCache = exports.getInstalledMods = exports.uninstallMods = exports.installMod = exports.removeModFromCache = exports.getCachedModVersions = exports.getCachedMod = exports.getCachedMods = exports.downloadMod = exports.loadCache = exports.addModToCache = exports.getModFromFile = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const node_stream_zip_1 = __importDefault(require("node-stream-zip"));
const semver_1 = require("semver");
const utils_1 = require("./utils");
const ficsitApp_1 = require("./ficsitApp");
const errors_1 = require("./errors");
const logging_1 = require("./logging");
const paths_1 = require("./paths");
const smlHandler_1 = require("./smlHandler");
let cachedMods = new Array();
let cacheLoaded = false;
const modExtensions = ['.smod'];
const SMM_TRACKED_FILE = '.smm';
function getModFromUPlugin(mod_reference, uplugin) {
    var _a, _b, _c, _d;
    const mod = {
        mod_id: mod_reference,
        mod_reference,
        name: uplugin.FriendlyName,
        version: uplugin.SemVersion || semver_1.valid(uplugin.VersionName) || `${uplugin.Version}.0.0`,
        description: uplugin.Description,
        authors: [...(((_a = uplugin.CreatedBy) === null || _a === void 0 ? void 0 : _a.split(',').map((author) => author.trim())) || []), (_b = uplugin.CreatedByURL) === null || _b === void 0 ? void 0 : _b.trim()].filter((str) => str && str.length > 0),
        objects: [],
        dependencies: Object.assign({}, ...(((_c = uplugin.Plugins) === null || _c === void 0 ? void 0 : _c.filter((depPlugin) => !depPlugin.bOptional).map((depPlugin) => ({ [depPlugin.Name]: depPlugin.SemVersion || '*' }))) || [])),
        optional_dependencies: Object.assign({}, ...(((_d = uplugin.Plugins) === null || _d === void 0 ? void 0 : _d.filter((depPlugin) => depPlugin.bOptional).map((depPlugin) => ({ [depPlugin.Name]: depPlugin.SemVersion || '*' }))) || [])),
    };
    return mod;
}
async function getModFromFile(modPath) {
    if (modExtensions.includes(path_1.default.extname(modPath))) {
        const zipData = new node_stream_zip_1.default({ file: modPath });
        await new Promise((resolve, reject) => { zipData.on('ready', resolve); zipData.on('error', (e) => { zipData.close(); reject(e); }); });
        if (zipData.entry('data.json')) {
            // SML 2.x
            const mod = JSON.parse(zipData.entryDataSync('data.json').toString('utf8'));
            zipData.close();
            if (!mod.mod_reference) {
                return undefined;
            }
            mod.path = modPath;
            return mod;
        }
        // SML 3.x
        const uplugin = Object.entries(zipData.entries()).find(([name]) => name.endsWith('.uplugin'));
        if (uplugin) {
            const upluginContent = JSON.parse(zipData.entryDataSync(uplugin[0]).toString('utf8'));
            zipData.close();
            const mod = getModFromUPlugin(path_1.default.basename(uplugin[0], '.uplugin'), upluginContent);
            mod.path = modPath;
            return mod;
        }
        zipData.close();
    }
    throw new errors_1.InvalidModFileError(`Invalid mod file ${modPath}. Extension is ${path_1.default.extname(modPath)}, required ${modExtensions.join(', ')}`);
}
exports.getModFromFile = getModFromFile;
async function addModToCache(modFile) {
    try {
        const mod = await getModFromFile(modFile);
        if (mod) {
            cachedMods.push(mod);
        }
        return mod;
    }
    catch (e) {
        fs_1.default.unlinkSync(modFile);
        logging_1.error(`Removing corrupt cached mod ${modFile}`);
        return undefined;
    }
}
exports.addModToCache = addModToCache;
async function loadCache() {
    cacheLoaded = true;
    cachedMods = new Array();
    const cacheAddPromises = Array();
    fs_1.default.readdirSync(paths_1.modCacheDir).forEach((file) => {
        const fullPath = path_1.default.join(paths_1.modCacheDir, file);
        cacheAddPromises.push(new Promise((resolve) => {
            addModToCache(fullPath).then(() => {
                resolve();
            });
        }));
    });
    await Promise.all(cacheAddPromises);
}
exports.loadCache = loadCache;
const DOWNLOAD_MOD_ATTEMPTS = 3;
async function downloadMod(modReference, version, attempt = 0) {
    if (attempt > DOWNLOAD_MOD_ATTEMPTS) {
        throw new Error(`${DOWNLOAD_MOD_ATTEMPTS} attempts to download ${modReference}@${version} failed`);
    }
    const downloadURL = await ficsitApp_1.getModDownloadLink(modReference, version);
    const filePath = path_1.default.join(paths_1.modCacheDir, `${modReference}_${version}.smod`);
    try {
        await utils_1.downloadFile(downloadURL, filePath, await ficsitApp_1.getModName(modReference), version);
        await getModFromFile(filePath);
        const ficsitAppModVersion = await ficsitApp_1.getModVersion(modReference, version);
        const isFlieHashMatching = utils_1.hashFile(filePath) === ficsitAppModVersion.hash;
        if (isFlieHashMatching) {
            return filePath;
        }
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        return downloadMod(modReference, version, attempt + 1);
    }
    catch (e) {
        logging_1.error(`Error downloading mod: ${e.message}`);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        return downloadMod(modReference, version, attempt + 1);
    }
}
exports.downloadMod = downloadMod;
async function getCachedMods() {
    if (!cacheLoaded) {
        logging_1.debug('Loading mod cache');
        await loadCache();
    }
    return cachedMods;
}
exports.getCachedMods = getCachedMods;
async function getCachedMod(modReference, version) {
    const mod = (await getCachedMods())
        .find((cachedMod) => (cachedMod.mod_reference === modReference) && cachedMod.version === version);
    const ficsitAppModVersion = await ficsitApp_1.getModVersion(modReference, version);
    const isModFileLatest = mod && (!mod.path || fs_1.default.statSync(mod.path).mtime >= ficsitAppModVersion.created_at);
    const isFlieHashMatching = mod && mod.path && utils_1.hashFile(mod.path) === ficsitAppModVersion.hash;
    if (!mod || !isModFileLatest || !isFlieHashMatching) {
        if (mod && !isModFileLatest) {
            logging_1.debug(`${modReference}@${version} was changed by the author. Redownloading.`);
            cachedMods.remove(mod);
        }
        else if (mod && !isFlieHashMatching) {
            logging_1.debug(`${modReference}@${version} is corrupted. Redownloading.`);
            cachedMods.remove(mod);
        }
        else {
            logging_1.debug(`${modReference}@${version} is not downloaded. Downloading now.`);
        }
        const modPath = await downloadMod(modReference, version);
        if (!modPath) {
            return undefined;
        }
        return addModToCache(modPath);
    }
    return mod;
}
exports.getCachedMod = getCachedMod;
async function getCachedModVersions(modReference) {
    return (await getCachedMods()).filter((cachedMod) => cachedMod.mod_reference === modReference)
        .map((mod) => mod.version);
}
exports.getCachedModVersions = getCachedModVersions;
async function removeModFromCache(modReference, version) {
    const mod = (await getCachedMods())
        .find((cachedMod) => cachedMod.mod_reference === modReference && cachedMod.version === version);
    if (mod) {
        cachedMods.remove(mod);
        if (mod.path) {
            fs_1.default.unlinkSync(mod.path);
        }
    }
}
exports.removeModFromCache = removeModFromCache;
async function installMod(modReference, version, modsDir, smlVersion) {
    var _a;
    const modPath = (_a = (await getCachedMod(modReference, version))) === null || _a === void 0 ? void 0 : _a.path;
    if (modPath) {
        if (smlVersion === smlHandler_1.SMLVersion.v2_x) {
            utils_1.copyFile(modPath, modsDir);
        }
        else if (smlVersion === smlHandler_1.SMLVersion.v3_x) {
            // eslint-disable-next-line new-cap
            const zipData = new node_stream_zip_1.default.async({ file: modPath });
            const extractPath = path_1.default.join(modsDir, modReference);
            paths_1.ensureExists(extractPath);
            await zipData.extract(null, extractPath);
            await zipData.close();
            fs_1.default.writeFileSync(path_1.default.join(extractPath, SMM_TRACKED_FILE), '');
        }
        else {
            throw new Error('Invalid smlVersion');
        }
    }
}
exports.installMod = installMod;
async function uninstallMods(modReferences, modsDir, smlVersion) {
    if (fs_1.default.existsSync(modsDir)) {
        if (smlVersion === smlHandler_1.SMLVersion.v2_x) {
            await Promise.all(fs_1.default.readdirSync(modsDir).map(async (file) => {
                const fullPath = path_1.default.join(modsDir, file);
                if (modExtensions.includes(path_1.default.extname(fullPath))) {
                    try {
                        const mod = await getModFromFile(fullPath);
                        if (mod && modReferences.includes(mod.mod_reference)) {
                            if (fs_1.default.existsSync(fullPath)) {
                                fs_1.default.unlinkSync(fullPath);
                            }
                        }
                    }
                    catch (e) {
                        logging_1.error(`Corrupt installed mod found ${fullPath}`);
                    }
                }
            }));
        }
        else if (smlVersion === smlHandler_1.SMLVersion.v3_x) {
            await Promise.all(fs_1.default.readdirSync(modsDir).map(async (dir) => {
                if (dir === utils_1.SMLID)
                    return;
                const fullPath = path_1.default.join(modsDir, dir);
                const upluginPath = path_1.default.join(fullPath, `${dir}.uplugin`);
                if (fs_1.default.existsSync(upluginPath)) {
                    try {
                        const mod = getModFromUPlugin(dir, JSON.parse(fs_1.default.readFileSync(upluginPath, { encoding: 'utf8' })));
                        if (modReferences.includes(mod.mod_reference)) {
                            fs_1.default.rmdirSync(fullPath, { recursive: true });
                        }
                    }
                    catch (e) {
                        logging_1.error(`Error reading mod ${fullPath}`);
                    }
                }
            }));
        }
        else {
            throw new Error('Invalid smlVersion');
        }
    }
}
exports.uninstallMods = uninstallMods;
async function getInstalledMods(modsDir, smlVersion) {
    if (!modsDir) {
        return [];
    }
    const installedModsPromises = new Array();
    if (fs_1.default.existsSync(modsDir)) {
        if (smlVersion === smlHandler_1.SMLVersion.v2_x) {
            fs_1.default.readdirSync(modsDir).forEach((file) => {
                const fullPath = path_1.default.join(modsDir, file);
                if (modExtensions.includes(path_1.default.extname(fullPath))) {
                    installedModsPromises.push((async () => {
                        try {
                            return await getModFromFile(fullPath);
                        }
                        catch (e) {
                            logging_1.error(`Corrupt installed mod found ${fullPath}`);
                        }
                        return undefined;
                    })());
                }
            });
        }
        else if (smlVersion === smlHandler_1.SMLVersion.v3_x) {
            fs_1.default.readdirSync(modsDir).forEach((dir) => {
                if (dir === utils_1.SMLID)
                    return;
                const fullPath = path_1.default.join(modsDir, dir);
                if (!fs_1.default.existsSync(path_1.default.join(fullPath, SMM_TRACKED_FILE)))
                    return;
                const upluginPath = path_1.default.join(fullPath, `${dir}.uplugin`);
                if (fs_1.default.existsSync(upluginPath)) {
                    try {
                        const mod = getModFromUPlugin(dir, JSON.parse(fs_1.default.readFileSync(upluginPath, { encoding: 'utf8' })));
                        mod.path = fullPath;
                        installedModsPromises.push(Promise.resolve(mod));
                    }
                    catch (e) {
                        logging_1.error(`Error reading mod ${fullPath}`);
                    }
                }
            });
        }
        else {
            throw new Error('Invalid smlVersion');
        }
    }
    const mods = new Array();
    (await Promise.all(installedModsPromises)).forEach((mod) => {
        if (mod) {
            mods.push(mod);
        }
    });
    return mods;
}
exports.getInstalledMods = getInstalledMods;
function clearCache() {
    cacheLoaded = false;
    cachedMods = new Array();
}
exports.clearCache = clearCache;
//# sourceMappingURL=modHandler.js.map