"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.unique = exports.hashFile = exports.hashString = exports.isRunning = exports.mergeArrays = exports.mapObject = exports.filterObject = exports.validAndGreater = exports.versionSatisfiesAll = exports.downloadFile = exports.addDownloadProgressCallback = exports.UserAgent = exports.isValidZip = exports.copyFile = exports.clearOutdatedCache = exports.clearCache = exports.deleteFolderRecursive = exports.dirs = exports.toggleDebug = exports.setDebug = exports.isDebug = exports.minSMLVersion = exports.BootstrapperID = exports.SMLID = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const semver_1 = require("semver");
const ps_list_1 = __importDefault(require("ps-list"));
const child_process_1 = require("child_process");
const got_1 = __importDefault(require("got"));
const crypto_1 = require("crypto");
const stream_1 = __importDefault(require("stream"));
const util_1 = require("util");
const node_stream_zip_1 = __importDefault(require("node-stream-zip"));
const logging_1 = require("./logging");
const errors_1 = require("./errors");
const paths_1 = require("./paths");
require("win-ca");
const pipeline = util_1.promisify(stream_1.default.pipeline);
exports.SMLID = 'SML';
exports.BootstrapperID = 'bootstrapper';
exports.minSMLVersion = '2.0.0';
let isDebugMode = ((_a = process.env.NODE_DEBUG) === null || _a === void 0 ? void 0 : _a.includes('SMManagerAPI')) || false;
logging_1.setLogDebug(isDebugMode);
function isDebug() {
    return isDebugMode;
}
exports.isDebug = isDebug;
function setDebug(shouldDebug) {
    isDebugMode = shouldDebug;
    logging_1.setLogDebug(shouldDebug);
}
exports.setDebug = setDebug;
function toggleDebug() {
    setDebug(!isDebugMode);
}
exports.toggleDebug = toggleDebug;
function dirs(p) {
    if (fs_1.default.existsSync(p)) {
        return fs_1.default.readdirSync(p).filter((f) => fs_1.default.statSync(path_1.default.join(p, f)).isDirectory());
    }
    return [];
}
exports.dirs = dirs;
function deleteFolderRecursive(deletePath) {
    if (fs_1.default.existsSync(deletePath)) {
        fs_1.default.readdirSync(deletePath).forEach((file) => {
            const curPath = path_1.default.join(deletePath, file);
            if (fs_1.default.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            }
            else { // delete file
                fs_1.default.unlinkSync(curPath);
            }
        });
        fs_1.default.rmdirSync(deletePath);
    }
}
exports.deleteFolderRecursive = deleteFolderRecursive;
function clearCache() {
    fs_1.default.readdirSync(paths_1.modCacheDir).forEach((file) => {
        const curPath = path_1.default.join(paths_1.modCacheDir, file);
        if (fs_1.default.statSync(curPath).isDirectory()) {
            deleteFolderRecursive(curPath);
        }
        else {
            fs_1.default.unlinkSync(curPath);
        }
    });
    fs_1.default.readdirSync(paths_1.smlCacheDir).forEach((file) => {
        const curPath = path_1.default.join(paths_1.smlCacheDir, file);
        if (fs_1.default.statSync(curPath).isDirectory()) {
            deleteFolderRecursive(curPath);
        }
        else {
            fs_1.default.unlinkSync(curPath);
        }
    });
    fs_1.default.readdirSync(paths_1.bootstrapperCacheDir).forEach((file) => {
        const curPath = path_1.default.join(paths_1.bootstrapperCacheDir, file);
        if (fs_1.default.statSync(curPath).isDirectory()) {
            deleteFolderRecursive(curPath);
        }
        else {
            fs_1.default.unlinkSync(curPath);
        }
    });
}
exports.clearCache = clearCache;
const CACHE_LIFETIME = 30 * 24 * 60 * 60 * 1000; // 30 days
function clearOutdatedCache() {
    const now = new Date();
    fs_1.default.readdirSync(paths_1.modCacheDir).forEach((file) => {
        const curPath = path_1.default.join(paths_1.modCacheDir, file);
        if (now.getTime() - fs_1.default.statSync(curPath).mtime.getTime() >= CACHE_LIFETIME) {
            if (fs_1.default.statSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath);
            }
            else {
                fs_1.default.unlinkSync(curPath);
            }
        }
    });
    fs_1.default.readdirSync(paths_1.smlCacheDir).forEach((file) => {
        const curPath = path_1.default.join(paths_1.smlCacheDir, file);
        if (now.getTime() - fs_1.default.statSync(curPath).mtime.getTime() >= CACHE_LIFETIME) {
            if (fs_1.default.statSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath);
            }
            else {
                fs_1.default.unlinkSync(curPath);
            }
        }
    });
    fs_1.default.readdirSync(paths_1.bootstrapperCacheDir).forEach((file) => {
        const curPath = path_1.default.join(paths_1.bootstrapperCacheDir, file);
        if (now.getTime() - fs_1.default.statSync(curPath).mtime.getTime() >= CACHE_LIFETIME) {
            if (fs_1.default.statSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath);
            }
            else {
                fs_1.default.unlinkSync(curPath);
            }
        }
    });
}
exports.clearOutdatedCache = clearOutdatedCache;
function copyFile(file, toDir) {
    paths_1.ensureExists(toDir);
    fs_1.default.copyFileSync(file, path_1.default.join(toDir, path_1.default.basename(file)));
}
exports.copyFile = copyFile;
async function isValidZip(file) {
    try {
        // eslint-disable-next-line new-cap
        const zipData = new node_stream_zip_1.default.async({ file });
        await zipData.entries();
        await zipData.close();
        return true;
    }
    catch (e) {
        return false;
    }
}
exports.isValidZip = isValidZip;
exports.UserAgent = `${((_b = process.env.SMM_API_USERAGENT) === null || _b === void 0 ? void 0 : _b.replace(' ', '')) || 'SatisfactoryModManagerAPI'}/${process.env.SMM_API_USERAGENT_VERSION || 'unknown'}`;
const DOWNLOAD_ATTEMPTS = 3;
const DOWNLOAD_TIMEOUT = 30 * 1000;
const progressCallbacks = [];
function addDownloadProgressCallback(cb) {
    if (!progressCallbacks.includes(cb)) {
        progressCallbacks.push(cb);
    }
}
exports.addDownloadProgressCallback = addDownloadProgressCallback;
async function downloadFile(url, file, name, version) {
    let interval;
    try {
        paths_1.ensureExists(path_1.default.dirname(file));
        const startTime = Date.now();
        let lastProgressTime = Date.now() + DOWNLOAD_TIMEOUT; // give some time to resolve the url and stuff
        const req = got_1.default.stream(url, {
            retry: {
                limit: DOWNLOAD_ATTEMPTS,
            },
            dnsCache: false,
            headers: {
                'User-Agent': exports.UserAgent,
            },
        });
        req.on('downloadProgress', (progress) => {
            if (progress.total) {
                progressCallbacks.forEach(async (cb) => cb(url, progress, name, version, Date.now() - startTime));
            }
            lastProgressTime = Date.now();
        });
        interval = setInterval(() => {
            if (Date.now() - lastProgressTime >= DOWNLOAD_TIMEOUT) {
                req.destroy();
            }
        }, 100);
        await pipeline(req, fs_1.default.createWriteStream(file));
        clearInterval(interval);
        return;
    }
    catch (e) {
        if (interval) {
            clearInterval(interval);
        }
        if (fs_1.default.existsSync(file)) {
            fs_1.default.unlinkSync(file);
        }
        if (e instanceof got_1.default.CancelError) {
            logging_1.debug(`Timed out downloading ${url}.`);
            throw new errors_1.NetworkError(`Timed out downloading ${url}.`, 408);
        }
        if (e.name === 'HTTPError') {
            logging_1.debug(`Network error while downloading file ${url}: ${e.message}. Trace:\n${e.stack}`);
            throw new errors_1.NetworkError(`Could not download file (${e.message}). Please try again later.`, e.response.statusCode);
        }
        logging_1.debug(`Unexpected error while downloading ${url}: ${e.message}. Trace:\n${e.stack}`);
        throw new Error(`Unexpected error while downloading file ${url}: ${e.message}. Trace:\n${e.stack}`);
    }
}
exports.downloadFile = downloadFile;
// eslint-disable-next-line no-extend-native
Array.prototype.forEachAsync = async function forEachAsync(callback) {
    for (let i = 0; i < this.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await callback(this[i], i, this);
    }
};
// eslint-disable-next-line no-extend-native
Array.prototype.remove = function remove(element) {
    const index = this.indexOf(element);
    if (index !== -1) {
        this.splice(index, 1);
    }
};
// eslint-disable-next-line no-extend-native
Array.prototype.removeWhere = function removeWhere(predicate) {
    const toRemove = new Array();
    this.forEach((value, index, array) => {
        if (predicate(value, index, array)) {
            toRemove.push(value);
        }
    });
    toRemove.forEach((element) => {
        this.remove(element);
    });
};
// eslint-disable-next-line no-extend-native, max-len
Array.prototype.removeWhereAsync = async function removeWhereAsync(predicate) {
    const toRemove = new Array();
    await Promise.all(this.map(async (value, index, array) => {
        if (await predicate(value, index, array)) {
            toRemove.push(value);
        }
    }));
    toRemove.forEach((element) => {
        this.remove(element);
    });
};
// eslint-disable-next-line no-extend-native, max-len
Array.prototype.filterAsync = async function filterAsync(predicate) {
    const results = await Promise.all(this.map(predicate));
    return this.filter((_v, index) => results[index]);
};
function versionSatisfiesAll(version, versionConstraints) {
    return versionConstraints.every((versionConstraint) => semver_1.satisfies(version, versionConstraint));
}
exports.versionSatisfiesAll = versionSatisfiesAll;
function validAndGreater(v1, v2) {
    const fixedV1 = semver_1.coerce(v1);
    const fixedV2 = semver_1.coerce(v2);
    if (!fixedV1 || !fixedV2)
        return false;
    return semver_1.gt(fixedV1, fixedV2);
}
exports.validAndGreater = validAndGreater;
function filterObject(object, filterFunction) {
    const filtered = {};
    Object.entries(object).filter((entry) => filterFunction(entry[0], entry[1])).forEach((entry) => {
        const key = entry[0];
        const val = entry[1];
        filtered[key] = val;
    });
    return filtered;
}
exports.filterObject = filterObject;
function mapObject(object, mapFunction) {
    const mapped = {};
    Object.entries(object).map((entry) => mapFunction(entry[0], entry[1])).forEach((entry) => {
        const key = entry[0];
        const val = entry[1];
        mapped[key] = val;
    });
    return mapped;
}
exports.mapObject = mapObject;
function mergeArrays(...arrays) {
    let jointArray = [];
    arrays.forEach((array) => {
        jointArray = [...jointArray, ...array];
    });
    const uniqueArray = jointArray.filter((item, index) => jointArray.indexOf(item) === index);
    return uniqueArray;
}
exports.mergeArrays = mergeArrays;
async function isRunning(command, strict = false) {
    try {
        // manual is now main to handle ghost instances
        let cmd = '';
        switch (process.platform) {
            case 'win32':
                cmd = `wmic process where (caption="${command}" and handlecount!="0") get commandline`;
                break;
            case 'darwin':
                cmd = `ps -ax | grep ${command}`;
                break;
            case 'linux':
                cmd = `ps -A | grep ${command}`;
                break;
            default: break;
        }
        const runningInstances = child_process_1.execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        return runningInstances.toLowerCase().indexOf(command.toLowerCase()) > -1;
    }
    catch (e) {
        // fallback to psList
        let runningInstances = [];
        if (process.platform === 'win32' || strict) {
            runningInstances = (await ps_list_1.default()).filter((process) => { var _a; return (_a = process.name) === null || _a === void 0 ? void 0 : _a.includes(command); });
        }
        else {
            runningInstances = (await ps_list_1.default()).filter((process) => { var _a; return (_a = process.cmd) === null || _a === void 0 ? void 0 : _a.includes(command); });
        }
        return runningInstances.length > 0;
    }
}
exports.isRunning = isRunning;
function hashString(s) {
    return crypto_1.createHash('sha256').update(s, 'utf8').digest('hex');
}
exports.hashString = hashString;
function hashFile(filePath) {
    return crypto_1.createHash('sha256').update(fs_1.default.readFileSync(filePath)).digest('hex');
}
exports.hashFile = hashFile;
function unique(value, index, self) {
    return self.indexOf(value) === index;
}
exports.unique = unique;
//# sourceMappingURL=utils.js.map