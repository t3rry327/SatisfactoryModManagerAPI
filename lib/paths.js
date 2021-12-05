"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileFolder = exports.logsDir = exports.bootstrapperCacheDir = exports.smlCacheDir = exports.modCacheDir = exports.downloadCacheDir = exports.cacheDir = exports.appDataDir = exports.appName = exports.ensureExists = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const platform_folders_1 = require("platform-folders");
function ensureExists(folder) {
    fs_1.default.mkdirSync(folder, { recursive: true });
}
exports.ensureExists = ensureExists;
exports.appName = 'SatisfactoryModManager';
exports.appDataDir = path_1.default.join(platform_folders_1.getDataHome(), exports.appName);
ensureExists(exports.appDataDir);
exports.cacheDir = path_1.default.join(platform_folders_1.getCacheFolder(), exports.appName);
ensureExists(exports.cacheDir);
exports.downloadCacheDir = path_1.default.join(exports.cacheDir, 'downloadCache');
ensureExists(exports.downloadCacheDir);
exports.modCacheDir = path_1.default.join(exports.downloadCacheDir, 'mods');
ensureExists(exports.modCacheDir);
exports.smlCacheDir = path_1.default.join(exports.downloadCacheDir, 'smlVersions');
ensureExists(exports.smlCacheDir);
exports.bootstrapperCacheDir = path_1.default.join(exports.downloadCacheDir, 'bootstrapperVersions');
ensureExists(exports.bootstrapperCacheDir);
exports.logsDir = path_1.default.join(exports.cacheDir, 'logs');
ensureExists(exports.logsDir);
exports.profileFolder = path_1.default.join(exports.appDataDir, 'profiles');
if (fs_1.default.existsSync(path_1.default.join(exports.appDataDir, 'configs')) && !fs_1.default.existsSync(exports.profileFolder)) {
    fs_1.default.renameSync(path_1.default.join(exports.appDataDir, 'configs'), exports.profileFolder);
}
ensureExists(exports.profileFolder);
//# sourceMappingURL=paths.js.map