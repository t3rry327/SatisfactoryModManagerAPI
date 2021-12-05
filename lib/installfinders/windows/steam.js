"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstalls = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const vdf_1 = __importDefault(require("vdf"));
const winreg_1 = __importDefault(require("winreg"));
const child_process_1 = require("child_process");
const satisfactoryInstall_1 = require("../../satisfactoryInstall");
const logging_1 = require("../../logging");
async function getRegValue(hive, key, valueName) {
    try {
        try {
            return await new Promise((resolve, reject) => {
                const reg = new winreg_1.default({
                    hive,
                    key,
                });
                reg.get(valueName, (err, result) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(result.value);
                });
            });
        }
        catch (e) {
            // Backup in case the other errors
            const output = child_process_1.execSync(`${path_1.default.join(process.env.windir || 'C:\\WINDOWS', 'system32', 'reg.exe')} QUERY "${hive}${key}" /v ${valueName}`, { encoding: 'utf8' });
            const regex = output.split('\n')[2].trim().match(/^\s*(.*)\s+(REG_SZ|REG_MULTI_SZ|REG_EXPAND_SZ|REG_DWORD|REG_QWORD|REG_BINARY|REG_NONE)\s+(.*)$/);
            if (!regex)
                return '';
            return regex[3];
        }
    }
    catch (e) {
        logging_1.error(`Could not get reg value of ${hive}\\${key}\\${valueName}`);
        return undefined;
    }
}
async function getInstalls() {
    try {
        const steamPath = path_1.default.dirname((await getRegValue(winreg_1.default.HKCU, '\\Software\\Valve\\Steam', 'SteamExe')) || 'C:\\Program Files (x86)\\Steam\\steam.exe');
        const steamAppsPath = path_1.default.join(steamPath, 'steamapps');
        const libraryfoldersManifest = vdf_1.default.parse(fs_1.default.readFileSync(path_1.default.join(steamAppsPath, 'libraryfolders.vdf'), 'utf8'));
        const libraryFolders = libraryfoldersManifest.LibraryFolders || libraryfoldersManifest.libraryfolders;
        if (!libraryFolders) {
            logging_1.warn('Steam libraryfolders.vdf does not contain the LibraryFolders key. Cannot check for Steam installs of the game');
            return { installs: [], invalidInstalls: [] };
        }
        const libraryfolders = Object.entries(libraryFolders).filter(([key]) => /^\d+$/.test(key)).map((entry) => (typeof entry[1] === 'string' ? entry[1] : entry[1].path));
        libraryfolders.push(steamPath);
        const installs = [];
        const invalidInstalls = [];
        await Promise.all(libraryfolders.map(async (libraryFolder) => {
            var _a;
            const sfManifestPath = path_1.default.join(libraryFolder, 'steamapps', 'appmanifest_526870.acf');
            if (fs_1.default.existsSync(sfManifestPath)) {
                const manifest = vdf_1.default.parse(fs_1.default.readFileSync(sfManifestPath, 'utf8'));
                if (!manifest || !manifest.AppState) {
                    logging_1.info(`Invalid steam manifest ${sfManifestPath}`);
                    return;
                }
                const fullInstallPath = path_1.default.join(libraryFolder, 'steamapps', 'common', manifest.AppState.installdir);
                const gameExe = path_1.default.join(fullInstallPath, 'FactoryGame.exe');
                if (!fs_1.default.existsSync(gameExe)) {
                    invalidInstalls.push(fullInstallPath);
                    return;
                }
                // The Steam manifest does not give game build number, so we have to get it from here. Will this file always contain the game build number and not the engine one?
                const versionFilePath = path_1.default.join(fullInstallPath, 'Engine', 'Binaries', 'Win64', 'FactoryGame-Win64-Shipping.version');
                const versionFile = JSON.parse(fs_1.default.readFileSync(versionFilePath, 'utf8'));
                const gameVersion = versionFile.BuildId;
                installs.push(new satisfactoryInstall_1.SatisfactoryInstall(`${manifest.AppState.name} ${((_a = manifest.AppState.UserConfig.betakey) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'experimental' ? 'Experimental' : 'Early Access'} (Steam)`, gameVersion, manifest.AppState.UserConfig.betakey || 'EA', fullInstallPath, 'start "" "steam://rungameid/526870"'));
            }
        }));
        return { installs, invalidInstalls };
    }
    catch (e) {
        if (e.message.includes('unable to find')) {
            logging_1.debug('Steam is not installed');
        }
        else {
            logging_1.error(e);
        }
        return { installs: [], invalidInstalls: [] };
    }
}
exports.getInstalls = getInstalls;
//# sourceMappingURL=steam.js.map