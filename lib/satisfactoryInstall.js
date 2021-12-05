"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renameProfile = exports.createProfile = exports.deleteProfile = exports.getProfiles = exports.SatisfactoryInstall = exports.profileExists = exports.getProfileFolderPath = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const semver_1 = require("semver");
const jszip_1 = __importDefault(require("jszip"));
const filenamify_1 = __importDefault(require("filenamify"));
const MH = __importStar(require("./modHandler"));
const SH = __importStar(require("./smlHandler"));
const BH = __importStar(require("./bootstrapperHandler"));
const ficsitApp_1 = require("./ficsitApp");
const manifest_1 = require("./manifest");
const lockfile_1 = require("./lockfile");
const utils_1 = require("./utils");
const logging_1 = require("./logging");
const errors_1 = require("./errors");
const paths_1 = require("./paths");
function getProfileFolderPath(profileName) {
    const profilePath = path_1.default.join(paths_1.profileFolder, profileName);
    paths_1.ensureExists(profilePath);
    return profilePath;
}
exports.getProfileFolderPath = getProfileFolderPath;
function profileExists(profileName) {
    const profilePath = path_1.default.join(paths_1.profileFolder, profileName);
    return fs_1.default.existsSync(profilePath);
}
exports.profileExists = profileExists;
const VANILLA_PROFILE_NAME = 'vanilla';
const MODDED_PROFILE_NAME = 'modded';
const DEVELOPMENT_PROFILE_NAME = 'development';
const CacheRelativePath = '.cache';
class SatisfactoryInstall {
    constructor(name, version, branch, installLocation, launchPath, setup) {
        this._profile = MODDED_PROFILE_NAME;
        this.name = name;
        this.version = version;
        this.branch = branch;
        this.installLocation = installLocation;
        this.launchPath = launchPath;
        this.setup = setup;
    }
    async _getInstalledMismatches(items) {
        const installedSML = SH.getSMLVersion(this.installLocation);
        const installedBootstrapper = BH.getBootstrapperVersion(this.installLocation);
        const installedMods = await MH.getInstalledMods(SH.getModsDir(this.installLocation), SH.getSMLVersionEnum(this.installLocation));
        const mismatches = {
            install: {},
            uninstall: [],
        };
        if (installedSML !== items[utils_1.SMLID]) {
            if (!items[utils_1.SMLID] || (installedSML && items[utils_1.SMLID])) {
                mismatches.uninstall.push(utils_1.SMLID);
            }
            if (items[utils_1.SMLID]) {
                mismatches.install[utils_1.SMLID] = items[utils_1.SMLID];
            }
        }
        if (installedBootstrapper !== items[utils_1.BootstrapperID]) {
            if (!items[utils_1.BootstrapperID] || (installedBootstrapper && items[utils_1.BootstrapperID])) {
                mismatches.uninstall.push(utils_1.BootstrapperID);
            }
            if (items[utils_1.BootstrapperID]) {
                mismatches.install[utils_1.BootstrapperID] = items[utils_1.BootstrapperID];
            }
        }
        const allMods = utils_1.mergeArrays(Object.keys(items)
            .filter((item) => item !== utils_1.SMLID && item !== utils_1.BootstrapperID), installedMods.map((mod) => mod.mod_reference));
        allMods.forEach((mod) => {
            var _a;
            const installedModVersion = (_a = installedMods
                .find((installedMod) => installedMod.mod_reference === mod)) === null || _a === void 0 ? void 0 : _a.version;
            if (installedModVersion !== items[mod]) {
                if (!items[mod] || (installedModVersion && items[mod])) {
                    mismatches.uninstall.push(mod);
                }
                if (items[mod]) {
                    mismatches.install[mod] = items[mod];
                }
            }
        });
        return mismatches;
    }
    async validateInstall(items) {
        logging_1.debug(`Items: ${JSON.stringify(items)}`);
        const mismatches = await this._getInstalledMismatches(items);
        logging_1.debug(`Mismatches: ${JSON.stringify(mismatches)}`);
        let modsDir = SH.getModsDir(this.installLocation);
        mismatches.uninstall.forEach((id) => logging_1.debug(`Removing ${id} from Satisfactory install`));
        await MH.uninstallMods(mismatches.uninstall, modsDir, SH.getSMLVersionEnum(this.installLocation));
        if (mismatches.uninstall.includes(utils_1.SMLID)) {
            logging_1.debug('Removing SML from Satisfactory install');
            await SH.uninstallSML(this.installLocation);
        }
        if (mismatches.uninstall.includes(utils_1.BootstrapperID)) {
            logging_1.debug('Removing Bootstrapper from Satisfactory install');
            await BH.uninstallBootstrapper(this.installLocation);
        }
        if (mismatches.install[utils_1.SMLID]) {
            logging_1.debug('Copying SML to Satisfactory install');
            await SH.installSML(mismatches.install[utils_1.SMLID], this.installLocation);
        }
        if (mismatches.install[utils_1.BootstrapperID]) {
            logging_1.debug('Copying Bootstrapper to Satisfactory install');
            await BH.installBootstrapper(mismatches.install[utils_1.BootstrapperID], this.installLocation);
        }
        if (Object.entries(mismatches.install).length > 0) {
            await MH.getCachedMods(); // Make sure the cache is loaded
        }
        modsDir = SH.getModsDir(this.installLocation);
        const smlVersionEnum = SH.getSMLVersionEnum(this.installLocation);
        await Promise.all(Object.entries(mismatches.install).map(async (modInstall) => {
            const modInstallID = modInstall[0];
            const modInstallVersion = modInstall[1];
            if (modInstallID !== utils_1.SMLID && modInstallID !== utils_1.BootstrapperID) {
                if (modsDir) {
                    logging_1.debug(`Copying ${modInstallID}@${modInstallVersion} to Satisfactory install`);
                    await MH.installMod(modInstallID, modInstallVersion, modsDir, smlVersionEnum);
                }
            }
        }));
    }
    async manifestMutate(install, uninstall, enable, disable, update) {
        if (this._profile === VANILLA_PROFILE_NAME && (install.length > 0 || update.length > 0)) {
            throw new errors_1.InvalidProfileError('Cannot modify vanilla profile. Use "modded" profile or create a new profile');
        }
        if (!await SatisfactoryInstall.isGameRunning()) {
            logging_1.debug(`install: [${install.map((item) => (item.version ? `${item.id}@${item.version}` : item.id)).join(', ')}], uninstall: [${uninstall.join(', ')}], enable: [${enable.join(', ')}], disable: [${disable.join(', ')}], update: [${update.join(', ')}]`);
            const currentManifest = this.readManifest();
            const currentLockfile = this.readLockfile();
            try {
                const newManifest = await manifest_1.mutateManifest(currentManifest, install, uninstall, enable, disable, update);
                try {
                    const newLockfile = await lockfile_1.computeLockfile(newManifest, currentLockfile, this.version, update);
                    await this.validateInstall(lockfile_1.getItemsList(newLockfile));
                    manifest_1.writeManifest(this.profileManifest, newManifest);
                    lockfile_1.writeLockfile(this.profileLockfile, newLockfile);
                }
                catch (e) {
                    if (install.length === 0 && update.length === 0 && enable.length === 0) {
                        manifest_1.writeManifest(this.profileManifest, newManifest); // save manifest when only uninstalling mods, so that other erroring can be uninstalled too
                    }
                    throw e;
                }
            }
            catch (e) {
                logging_1.error(e);
                await this.validateInstall(lockfile_1.getItemsList(currentLockfile));
                throw e;
            }
        }
        else {
            throw new errors_1.GameRunningError('Satisfactory is running. Please close it and wait until it fully shuts down.');
        }
    }
    async setProfile(profileName) {
        const currentProfile = this._profile;
        this._profile = profileName;
        try {
            logging_1.debug(`Setting profile to ${profileName}`);
            await this.manifestMutate([], [], [], [], []);
        }
        catch (e) {
            this._profile = currentProfile;
            throw new errors_1.InvalidProfileError(`Error while loading profile: ${e.message}`);
        }
    }
    get profile() {
        return this._profile;
    }
    async _installItem(id, version) {
        return this.manifestMutate([{ id, version, enabled: true }], [], [], [], []);
    }
    async _uninstallItem(item) {
        return this.manifestMutate([], [item], [], [], []);
    }
    async _enableItem(item) {
        return this.manifestMutate([], [], [item], [], []);
    }
    async _disableItem(item) {
        return this.manifestMutate([], [], [], [item], []);
    }
    async _updateItem(item) {
        return this.manifestMutate([], [], [], [], [item]);
    }
    async installMod(modReference, version) {
        logging_1.info(`Installing ${modReference}${version ? `@${version}` : ''}`);
        await this._installItem(modReference, version);
    }
    async uninstallMod(modReference) {
        logging_1.info(`Uninstalling ${modReference}`);
        return this._uninstallItem(modReference);
    }
    async enableMod(modReference) {
        logging_1.info(`Enabling ${modReference}`);
        await this._enableItem(modReference);
    }
    async disableMod(modReference) {
        logging_1.info(`Disabling ${modReference}`);
        return this._disableItem(modReference);
    }
    async updateMod(modReference) {
        logging_1.info(`Updating ${modReference}`);
        await this._updateItem(modReference);
    }
    async _getInstalledMods() {
        return MH.getInstalledMods(SH.getModsDir(this.installLocation), SH.getSMLVersionEnum(this.installLocation));
    }
    get mods() {
        return utils_1.filterObject(this._itemsList, (id) => id !== utils_1.SMLID && id !== utils_1.BootstrapperID);
    }
    get manifestMods() {
        return this.readManifest().items
            .filter((item) => item.id !== utils_1.SMLID && item.id !== utils_1.BootstrapperID);
    }
    async installSML(version) {
        return this._installItem(utils_1.SMLID, version);
    }
    async uninstallSML() {
        return this._uninstallItem(utils_1.SMLID);
    }
    async updateSML() {
        logging_1.info('Updating SML to latest version');
        await this._updateItem(utils_1.SMLID);
    }
    async _getInstalledSMLVersion() {
        return SH.getSMLVersion(this.installLocation);
    }
    get smlVersion() {
        return this._itemsList[utils_1.SMLID];
    }
    get manifestSML() {
        return this.readManifest().items.find((item) => item.id === utils_1.SMLID);
    }
    async updateBootstrapper() {
        logging_1.info('Updating bootstrapper to latest version');
        await this._updateItem(utils_1.BootstrapperID);
    }
    async clearCache() {
        if (!await SatisfactoryInstall.isGameRunning()) {
            MH.clearCache();
            utils_1.deleteFolderRecursive(path_1.default.join(this.installLocation, CacheRelativePath));
        }
        else {
            throw new errors_1.GameRunningError('Satisfactory is running. Please close it and wait until it fully shuts down.');
        }
    }
    async checkForUpdates() {
        const currentManifest = this.readManifest();
        const currentLockfile = this.readLockfile();
        await ficsitApp_1.refetchVersions();
        const newLockfile = await lockfile_1.computeLockfile(currentManifest, currentLockfile, this.version, Object.keys(this._itemsList));
        return Promise.all(Object.entries(newLockfile)
            .filter(([item, { version: newVersion }]) => !!currentLockfile[item] && !semver_1.eq(currentLockfile[item].version, newVersion))
            .map(async ([item, { version: newVersion }]) => {
            const currentVersion = currentLockfile[item].version;
            if (item === utils_1.SMLID) {
                const versions = await ficsitApp_1.getAvailableSMLVersions();
                return {
                    item, currentVersion, version: newVersion, releases: versions.filter((ver) => utils_1.validAndGreater(ver.version, currentVersion)),
                };
            }
            if (item === utils_1.BootstrapperID) {
                const versions = await ficsitApp_1.getAvailableBootstrapperVersions();
                return {
                    item, currentVersion, version: newVersion, releases: versions.filter((ver) => utils_1.validAndGreater(ver.version, currentVersion)),
                };
            }
            const versions = await ficsitApp_1.getModVersions(item);
            return {
                item, currentVersion, version: newVersion, releases: versions.filter((ver) => utils_1.validAndGreater(ver.version, currentVersion)),
            };
        }));
    }
    async importProfile(filePath, profileName, includeVersions = false) {
        if (profileExists(profileName)) {
            throw new errors_1.InvalidProfileError(`Profile ${profileName} already exists. Delete it, or choose another name for the profile`);
        }
        paths_1.ensureExists(getProfileFolderPath(profileName));
        let lockfile;
        let manifest;
        let metadata;
        try {
            const profileFile = await jszip_1.default.loadAsync(fs_1.default.readFileSync(filePath));
            const lockfileFile = profileFile.file('lockfile.json');
            const manifestFile = profileFile.file('manifest.json');
            const metadataFile = profileFile.file('metadata.json');
            if (!lockfileFile || !manifestFile || !metadataFile) {
                throw new Error('Profile file is invalid');
            }
            lockfile = JSON.parse(await lockfileFile.async('text'));
            manifest = JSON.parse(await manifestFile.async('text'));
            metadata = JSON.parse(await metadataFile.async('text'));
        }
        catch (e) {
            throw new Error('Error while reading profile');
        }
        if (utils_1.validAndGreater(metadata.gameVersion, this.version)) {
            logging_1.warn(`The profile you're importing is made for game version ${metadata.gameVersion}, but you're using ${this.version}. Things might not work as expected. ${includeVersions ? 'Including versions.' : 'No versions.'}`);
        }
        manifest_1.writeManifest(path_1.default.join(getProfileFolderPath(profileName), 'manifest.json'), manifest);
        if (includeVersions) {
            lockfile_1.writeLockfile(path_1.default.join(getProfileFolderPath(profileName), this.lockfileName), lockfile);
        }
        try {
            await this.setProfile(profileName);
        }
        catch (e) {
            utils_1.deleteFolderRecursive(getProfileFolderPath(profileName));
            throw e;
        }
    }
    async exportProfile(filePath) {
        const manifest = this.readManifest();
        const lockfile = this.readLockfile();
        const metadata = { gameVersion: this.version };
        const profileFile = new jszip_1.default();
        profileFile.file('manifest.json', JSON.stringify(manifest));
        profileFile.file('lockfile.json', JSON.stringify(lockfile));
        profileFile.file('metadata.json', JSON.stringify(metadata));
        return new Promise((resolve, reject) => {
            profileFile.generateNodeStream().pipe(fs_1.default.createWriteStream(filePath)).on('finish', resolve).on('error', reject);
        });
    }
    static async isGameRunning() {
        return (await Promise.all([utils_1.isRunning('FactoryGame-Win64-Shipping.exe'), await utils_1.isRunning('UE4-Win64-Shipping.exe')])).some((running) => running);
    }
    get bootstrapperVersion() {
        return this._itemsList[utils_1.BootstrapperID];
    }
    async _getInstalledBootstrapperVersion() {
        return BH.getBootstrapperVersion(this.installLocation);
    }
    get _itemsList() {
        return lockfile_1.getItemsList(this.readLockfile());
    }
    get binariesDir() {
        return path_1.default.join(this.installLocation, 'FactoryGame', 'Binaries', 'Win64');
    }
    get displayName() {
        return `${this.name} - CL${this.version}`;
    }
    get modsDir() {
        return SH.getModsDir(this.installLocation);
    }
    get profileManifest() {
        return path_1.default.join(getProfileFolderPath(this._profile), 'manifest.json');
    }
    get profileLockfile() {
        return path_1.default.join(getProfileFolderPath(this._profile), this.lockfileName);
    }
    get lockfileName() {
        return `lock-${utils_1.hashString(`${this.installLocation}|${this.branch}`)}.json`;
    }
    readManifest() {
        return manifest_1.readManifest(this.profileManifest);
    }
    readLockfile() {
        return lockfile_1.readLockfile(this.profileLockfile);
    }
}
exports.SatisfactoryInstall = SatisfactoryInstall;
function getProfiles() {
    return utils_1.dirs(paths_1.profileFolder).sort().map((name) => {
        try {
            const manifest = manifest_1.readManifest(path_1.default.join(getProfileFolderPath(name), 'manifest.json'));
            return { name, items: manifest.items };
        }
        catch (e) {
            logging_1.error(`Error while reading profile manifest ${name}: ${e.message}`);
            return { name, items: [] };
        }
    });
}
exports.getProfiles = getProfiles;
function isBuiltinProfile(name) {
    return name.toLowerCase() === VANILLA_PROFILE_NAME || name.toLowerCase() === MODDED_PROFILE_NAME || name.toLowerCase() === DEVELOPMENT_PROFILE_NAME;
}
function deleteProfile(name) {
    if (isBuiltinProfile(name)) {
        throw new errors_1.InvalidProfileError(`Cannot delete ${name} profile (it is part of the default set of profiles)`);
    }
    if (profileExists(name)) {
        utils_1.deleteFolderRecursive(getProfileFolderPath(name));
    }
}
exports.deleteProfile = deleteProfile;
function createProfile(name, copyProfile = 'vanilla') {
    const validName = filenamify_1.default(name, { replacement: '_' });
    if (profileExists(validName)) {
        throw new errors_1.InvalidProfileError(`Profile ${validName} already exists`);
    }
    if (!profileExists(copyProfile)) {
        throw new errors_1.InvalidProfileError(`Profile ${copyProfile} does not exist`);
    }
    manifest_1.writeManifest(path_1.default.join(getProfileFolderPath(validName), 'manifest.json'), manifest_1.readManifest(path_1.default.join(getProfileFolderPath(copyProfile), 'manifest.json')));
}
exports.createProfile = createProfile;
function renameProfile(oldName, newName) {
    if (isBuiltinProfile(oldName)) {
        throw new errors_1.InvalidProfileError(`Cannot rename ${oldName} profile (it is part of the default set of profiles)`);
    }
    const validName = filenamify_1.default(oldName, { replacement: '_' });
    const validNewName = filenamify_1.default(newName, { replacement: '_' });
    if (!profileExists(validName)) {
        throw new errors_1.InvalidProfileError(`Profile ${validName} does not exist.`);
    }
    if (profileExists(validNewName)) {
        throw new errors_1.InvalidProfileError(`Profile ${validNewName} already exists.`);
    }
    fs_1.default.renameSync(getProfileFolderPath(validName), path_1.default.join(paths_1.profileFolder, validNewName));
}
exports.renameProfile = renameProfile;
if (!fs_1.default.existsSync(path_1.default.join(getProfileFolderPath(VANILLA_PROFILE_NAME), 'manifest.json'))) {
    manifest_1.writeManifest(path_1.default.join(getProfileFolderPath(VANILLA_PROFILE_NAME), 'manifest.json'), { items: new Array(), manifestVersion: manifest_1.ManifestVersion.Latest });
}
if (!fs_1.default.existsSync(path_1.default.join(getProfileFolderPath(MODDED_PROFILE_NAME), 'manifest.json'))) {
    manifest_1.writeManifest(path_1.default.join(getProfileFolderPath(MODDED_PROFILE_NAME), 'manifest.json'), { items: new Array(), manifestVersion: manifest_1.ManifestVersion.Latest });
}
if (!fs_1.default.existsSync(path_1.default.join(getProfileFolderPath(DEVELOPMENT_PROFILE_NAME), 'manifest.json'))) {
    manifest_1.writeManifest(path_1.default.join(getProfileFolderPath(DEVELOPMENT_PROFILE_NAME), 'manifest.json'), { items: [{ id: utils_1.SMLID, enabled: true }], manifestVersion: manifest_1.ManifestVersion.Latest });
}
//# sourceMappingURL=satisfactoryInstall.js.map