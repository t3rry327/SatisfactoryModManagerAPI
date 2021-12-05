"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstalls = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const logging_1 = require("../../logging");
const satisfactoryInstall_1 = require("../../satisfactoryInstall");
const EpicManifestsFolderRelative = path_1.default.join('Epic', 'EpicGamesLauncher', 'Data', 'Manifests');
const UEInstalledManifestRelative = path_1.default.join('Epic', 'UnrealEngineLauncher', 'LauncherInstalled.dat');
function getInstalls() {
    const installs = [];
    const invalidInstalls = [];
    try {
        const lutrisGames = JSON.parse(child_process_1.execSync('lutris -lj', { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }));
        lutrisGames.forEach((lutrisGame) => {
            if (!lutrisGame.directory) {
                logging_1.debug(`Lutris game ${lutrisGame.name} has null directory.`);
                return;
            }
            const programData = path_1.default.join(lutrisGame.directory, 'dosdevices', 'c:', 'ProgramData');
            const EpicManifestsFolder = path_1.default.join(programData, EpicManifestsFolderRelative);
            const UEInstalledManifest = path_1.default.join(programData, UEInstalledManifestRelative);
            if (fs_1.default.existsSync(EpicManifestsFolder)) {
                let foundInstalls = [];
                fs_1.default.readdirSync(EpicManifestsFolder).forEach((fileName) => {
                    if (fileName.endsWith('.item')) {
                        const filePath = path_1.default.join(EpicManifestsFolder, fileName);
                        try {
                            const jsonString = fs_1.default.readFileSync(filePath, 'utf8');
                            const manifest = JSON.parse(jsonString);
                            if (manifest.CatalogNamespace === 'crab') {
                                const realInstallLocation = path_1.default.join(lutrisGame.directory, 'dosdevices', `${manifest.InstallLocation[0].toLowerCase()}:`, manifest.InstallLocation.replace(/\\/g, '/').substr(2));
                                try {
                                    const realManifestLocation = path_1.default.join(lutrisGame.directory, 'dosdevices', `${manifest.ManifestLocation[0].toLowerCase()}:`, manifest.ManifestLocation.replace(/\\/g, '/').substr(2));
                                    const gameManifestString = fs_1.default.readFileSync(path_1.default.join(realManifestLocation, `${manifest.InstallationGuid}.mancpn`), 'utf8');
                                    const gameManifest = JSON.parse(gameManifestString);
                                    if (gameManifest.AppName === manifest.MainGameAppName
                                        && gameManifest.CatalogItemId === manifest.CatalogItemId
                                        && gameManifest.CatalogNamespace === manifest.CatalogNamespace) {
                                        const installWithSamePath = foundInstalls.find((install) => install.installLocation === realInstallLocation);
                                        if (installWithSamePath) {
                                            if (parseInt(manifest.AppVersionString, 10) > parseInt(installWithSamePath.version, 10)) {
                                                installWithSamePath.version = manifest.AppVersionString;
                                            }
                                        }
                                        else {
                                            foundInstalls.push(new satisfactoryInstall_1.SatisfactoryInstall(`${manifest.DisplayName} (Lutris - ${lutrisGame.name})`, manifest.AppVersionString, manifest.AppName.substr('Crab'.length), realInstallLocation, `lutris lutris:rungame/${lutrisGame.slug}`));
                                        }
                                    }
                                    else {
                                        invalidInstalls.push(realInstallLocation);
                                    }
                                }
                                catch (e) {
                                    invalidInstalls.push(realInstallLocation);
                                }
                            }
                        }
                        catch (e) {
                            logging_1.info(`Found invalid manifest: ${fileName}`);
                        }
                    }
                });
                let installedManifest = { InstallationList: [] };
                if (fs_1.default.existsSync(UEInstalledManifest)) {
                    try {
                        installedManifest = JSON.parse(fs_1.default.readFileSync(UEInstalledManifest, 'utf8'));
                        if (foundInstalls.length > 0) {
                            foundInstalls = foundInstalls.filter((install) => installedManifest.InstallationList.some((manifestInstall) => {
                                const realManifestInstall = path_1.default.join(lutrisGame.directory, 'dosdevices', `${manifestInstall.InstallLocation[0].toLowerCase()}:`, manifestInstall.InstallLocation.replace(/\\/g, '/').substr(2));
                                return realManifestInstall === install.installLocation;
                            })); // Filter out old .items left over by Epic
                            if (foundInstalls.length === 0) {
                                logging_1.warn('UE manifest filtered all installs.');
                            }
                        }
                    }
                    catch (e) {
                        logging_1.info('Invalid UE manifest. The game might appear multiple times.');
                    }
                }
                else {
                    logging_1.info('Invalid UE manifest. The game might appear multiple times.');
                }
                foundInstalls.forEach((install) => installs.push(install));
            }
            else {
                logging_1.debug(`Epic Games Launcher is not installed in Lutris - ${lutrisGame.name}`);
            }
        });
        return { installs, invalidInstalls };
    }
    catch (e) {
        logging_1.error(e);
        return { installs: [], invalidInstalls: [] };
    }
}
exports.getInstalls = getInstalls;
//# sourceMappingURL=lutrisEpic.js.map