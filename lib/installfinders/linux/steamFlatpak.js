"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstalls = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const vdf_1 = __importDefault(require("vdf"));
const satisfactoryInstall_1 = require("../../satisfactoryInstall");
const logging_1 = require("../../logging");
const STEAM_DATA_LOCATION = `${process.env.HOME}/.var/app/com.valvesoftware.Steam/.steam/steam`;
async function getInstalls() {
    const installs = [];
    const invalidInstalls = [];
    const steamAppsPath = path_1.default.join(STEAM_DATA_LOCATION, 'steamapps');
    if (fs_1.default.existsSync(steamAppsPath)) {
        try {
            const libraryfoldersManifest = vdf_1.default.parse(fs_1.default.readFileSync(path_1.default.join(steamAppsPath, 'libraryfolders.vdf'), 'utf8'));
            const libraryFolders = libraryfoldersManifest.LibraryFolders || libraryfoldersManifest.libraryfolders;
            if (!libraryFolders) {
                logging_1.warn('Steam-flatpak libraryfolders.vdf does not contain the LibraryFolders key. Cannot check for Steam installs of the game');
                return { installs: [], invalidInstalls: [] };
            }
            const libraryfolders = Object.entries(libraryFolders).filter(([key]) => /^\d+$/.test(key)).map((entry) => (typeof entry[1] === 'string' ? entry[1] : entry[1].path));
            libraryfolders.push(STEAM_DATA_LOCATION);
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
                    installs.push(new satisfactoryInstall_1.SatisfactoryInstall(`${manifest.AppState.name} ${((_a = manifest.AppState.UserConfig.betakey) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'experimental' ? 'Experimental' : 'Early Access'} (Steam)`, gameVersion, manifest.AppState.UserConfig.betakey || 'EA', fullInstallPath, 'flatpak run com.valvesoftware.Steam steam://rungameid/526870'));
                }
            }));
        }
        catch (e) {
            logging_1.error(e);
        }
    }
    else {
        logging_1.debug('Steam-flatpak is not installed');
    }
    return { installs, invalidInstalls };
}
exports.getInstalls = getInstalls;
//# sourceMappingURL=steamFlatpak.js.map