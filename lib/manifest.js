"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeManifest = exports.readManifest = exports.mutateManifest = exports.ManifestVersion = void 0;
const fs_1 = __importDefault(require("fs"));
const lodash_1 = __importDefault(require("lodash"));
const logging_1 = require("./logging");
const ficsitApp_1 = require("./ficsitApp");
const errors_1 = require("./errors");
var ManifestVersion;
(function (ManifestVersion) {
    // pre 1.1.3, unversioned
    ManifestVersion[ManifestVersion["AddedManifestVersions"] = 0] = "AddedManifestVersions";
    ManifestVersion[ManifestVersion["RemovedGameVersion"] = 1] = "RemovedGameVersion";
    ManifestVersion[ManifestVersion["AddedEnabled"] = 2] = "AddedEnabled";
    ManifestVersion[ManifestVersion["LatestPlusOne"] = 3] = "LatestPlusOne";
    ManifestVersion[ManifestVersion["Latest"] = 2] = "Latest";
})(ManifestVersion = exports.ManifestVersion || (exports.ManifestVersion = {}));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function checkUpgradeManifest(manifest) {
    const upgradedManifest = { manifestVersion: ManifestVersion.Latest, items: manifest.items };
    if (!manifest.manifestVersion) {
        manifest.manifestVersion = -1;
    }
    switch (manifest.manifestVersion + 1) {
        case ManifestVersion.AddedManifestVersions:
            if (manifest.item) {
                upgradedManifest.items = manifest.item;
            }
        // fall through
        case ManifestVersion.RemovedGameVersion:
        // Nothing
        // fall through
        case ManifestVersion.AddedEnabled:
            upgradedManifest.items.forEach(((item) => { item.enabled = true; }));
        // fall through
        default:
            break;
    }
    return upgradedManifest;
}
async function mutateManifest(currentManifest, install, uninstall, enable, disable, update) {
    const newManifest = lodash_1.default.cloneDeep(currentManifest);
    // Install / uninstall / update (remove set version) items
    uninstall.forEach((item) => {
        newManifest.items.removeWhere((manifestItem) => manifestItem.id === item);
    });
    install.forEach((item) => {
        const existingItem = newManifest.items.find((manifestItem) => manifestItem.id === item.id);
        if (!existingItem) {
            newManifest.items.push(item);
        }
        else {
            existingItem.version = item.version;
        }
    });
    enable.forEach((item) => {
        const existingItem = newManifest.items.find((manifestItem) => manifestItem.id === item);
        if (existingItem) {
            existingItem.enabled = true;
        }
    });
    disable.forEach((item) => {
        const existingItem = newManifest.items.find((manifestItem) => manifestItem.id === item);
        if (existingItem) {
            existingItem.enabled = false;
        }
    });
    update.forEach((item) => {
        const existingItem = newManifest.items.find((manifestItem) => manifestItem.id === item);
        if (existingItem) {
            delete existingItem.version;
        }
    });
    // Convert items from mod ID to mod reference
    await Promise.all(newManifest.items.map(async (item, idx) => {
        const isOnFicsitApp = await ficsitApp_1.existsOnFicsitApp(item.id);
        if (!isOnFicsitApp) {
            try {
                const modReference = await ficsitApp_1.getModReferenceFromId(item.id);
                newManifest.items[idx].id = modReference;
                logging_1.debug(`Converted mod ${modReference} from mod ID to mod reference in manifest`);
            }
            catch (e) {
                if (!(e instanceof errors_1.ModNotFoundError)) {
                    throw e;
                }
            }
        }
    }));
    // Remove mods that were deleted from ficsit.app
    await newManifest.items.removeWhereAsync(async (item) => !(await ficsitApp_1.existsOnFicsitApp(item.id)));
    return newManifest;
}
exports.mutateManifest = mutateManifest;
function readManifest(filePath) {
    try {
        return checkUpgradeManifest(JSON.parse(fs_1.default.readFileSync(filePath, 'utf8')));
    }
    catch (e) {
        return {
            manifestVersion: ManifestVersion.Latest,
            items: [],
        };
    }
}
exports.readManifest = readManifest;
function writeManifest(filePath, manifest) {
    fs_1.default.writeFileSync(filePath, JSON.stringify(manifest));
}
exports.writeManifest = writeManifest;
//# sourceMappingURL=manifest.js.map