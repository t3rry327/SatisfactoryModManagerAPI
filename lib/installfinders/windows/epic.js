"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstalls = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const platform_folders_1 = require("platform-folders");
const logging_1 = require("../../logging");
const satisfactoryInstall_1 = require("../../satisfactoryInstall");
const EpicManifestsFolder = path_1.default.join(platform_folders_1.getDataFolders()[0], 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests');
const UEInstalledManifest = path_1.default.join(platform_folders_1.getDataFolders()[0], 'Epic', 'UnrealEngineLauncher', 'LauncherInstalled.dat');
function getInstalls() {
    let foundInstalls = [];
    const invalidInstalls = [];
    if (fs_1.default.existsSync(EpicManifestsFolder)) {
        fs_1.default.readdirSync(EpicManifestsFolder).forEach((fileName) => {
            if (fileName.endsWith('.item')) {
                const filePath = path_1.default.join(EpicManifestsFolder, fileName);
                try {
                    const jsonString = fs_1.default.readFileSync(filePath, 'utf8');
                    const manifest = JSON.parse(jsonString);
                    if (manifest.CatalogNamespace === 'helloneighbor') {
                        try {
                            const gameManifestString = fs_1.default.readFileSync(path_1.default.join(manifest.ManifestLocation, `${manifest.InstallationGuid}.mancpn`), 'utf8');
                            const gameManifest = JSON.parse(gameManifestString);
                            if (gameManifest.AppName === manifest.MainGameAppName
                                && gameManifest.CatalogItemId === manifest.CatalogItemId
                                && gameManifest.CatalogNamespace === manifest.CatalogNamespace) {
                                const installWithSamePath = foundInstalls.find((install) => install.installLocation === manifest.InstallLocation);
                                if (installWithSamePath) {
                                    if (parseInt(manifest.AppVersionString, 10) > parseInt(installWithSamePath.version, 10)) {
                                        installWithSamePath.version = manifest.AppVersionString;
                                    }
                                }
                                else {
                                    foundInstalls.push(new satisfactoryInstall_1.SatisfactoryInstall(`${manifest.DisplayName} (Epic Games)`, manifest.AppVersionString, manifest.AppName.substr('Crab'.length), manifest.InstallLocation, `start "" "com.epicgames.launcher://apps/${manifest.MainGameAppName}?action=launch&silent=true"`));
                                }
                            }
                            else {
                                invalidInstalls.push(manifest.InstallLocation);
                            }
                        }
                        catch (e) {
                            invalidInstalls.push(manifest.InstallLocation);
                        }
                    }
                }
                catch (e) {
                    logging_1.info(`Found invalid manifest: ${fileName}`);
                }
            }
        });
    }
    else {
        logging_1.debug('Epic Games Launcher is not installed');
        return { installs: [], invalidInstalls: [] };
    }
    let installedManifest = { InstallationList: [] };
    if (fs_1.default.existsSync(UEInstalledManifest)) {
        try {
            installedManifest = JSON.parse(fs_1.default.readFileSync(UEInstalledManifest, 'utf8'));
            // Filter out old .items left over by Epic
            // In some weird cases, the game isn't listed in the UE manifest, so we're not removing the install if that happens
            foundInstalls = foundInstalls
                .filter((install) => installedManifest.InstallationList.some((manifestInstall) => manifestInstall.InstallLocation === install.installLocation)
                || !installedManifest.InstallationList.some((manifestInstall) => manifestInstall.ArtifactId === `Crab${install.branch}`));
            if (foundInstalls.length === 0) {
                logging_1.warn('UE manifest filtered all installs.');
            }
        }
        catch (e) {
            logging_1.info('Invalid UE manifest. The game might appear multiple times.');
        }
    }
    else {
        logging_1.info('Invalid UE manifest. The game might appear multiple times.');
    }
    return { installs: foundInstalls, invalidInstalls };
}
exports.getInstalls = getInstalls;
//# sourceMappingURL=epic.js.map