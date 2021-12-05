"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getItemsList = exports.writeLockfile = exports.readLockfile = exports.computeLockfile = exports.LockfileGraph = exports.getFriendlyItemName = exports.getItemData = void 0;
/* eslint-disable no-await-in-loop */
const semver_1 = require("semver");
const fs_1 = __importDefault(require("fs"));
const lodash_1 = __importDefault(require("lodash"));
const ficsitApp_1 = require("./ficsitApp");
const errors_1 = require("./errors");
const logging_1 = require("./logging");
const utils_1 = require("./utils");
async function getItemData(id, version) {
    if (id === utils_1.SMLID) {
        const smlVersionInfo = await ficsitApp_1.getSMLVersionInfo(version);
        if (smlVersionInfo === undefined) {
            throw new errors_1.ModNotFoundError(`SML@${version} not found`, 'SML', version);
        }
        if (semver_1.satisfies(version, '>=3.0.0')) {
            return { id, version, dependencies: { FactoryGame: `>=${semver_1.valid(semver_1.coerce(smlVersionInfo.satisfactory_version.toString()))}` } };
        }
        return { id, version, dependencies: { FactoryGame: `>=${semver_1.valid(semver_1.coerce(smlVersionInfo.satisfactory_version.toString()))}`, [utils_1.BootstrapperID]: `>=${smlVersionInfo.bootstrap_version}` } };
    }
    if (id === utils_1.BootstrapperID) {
        const bootstrapperVersionInfo = await ficsitApp_1.getBootstrapperVersionInfo(version);
        if (bootstrapperVersionInfo === undefined) {
            throw new errors_1.ModNotFoundError(`bootstrapper@${version} not found`, 'bootstrapper', version);
        }
        return { id, version, dependencies: { FactoryGame: `>=${semver_1.valid(semver_1.coerce(bootstrapperVersionInfo.satisfactory_version.toString()))}` } };
    }
    if (id === 'FactoryGame') {
        throw new errors_1.InvalidLockfileOperation('Cannot modify Satisfactory Game version. This should never happen, unless Satisfactory was not temporarily added to the lockfile as a manifest entry');
    }
    let modData = await ficsitApp_1.getModVersion(id, version);
    if (!modData) {
        throw new errors_1.ModNotFoundError(`${id}@${version} not found`, id, version);
    }
    if (!modData.dependencies) {
        modData.dependencies = [];
    }
    if (!modData.dependencies.some((dep) => dep.mod_id === 'SML') && modData.sml_version) {
        modData = lodash_1.default.cloneDeep(modData);
        modData.dependencies.push({ mod_id: utils_1.SMLID, condition: `^${semver_1.valid(semver_1.coerce(modData.sml_version))}`, optional: false });
    }
    return {
        id,
        version: modData.version,
        dependencies: modData.dependencies
            ? modData.dependencies.reduce((prev, current) => (!current.optional ? Object.assign(prev, { [current.mod_id]: current.condition }) : prev), {})
            : {},
    };
}
exports.getItemData = getItemData;
async function getFriendlyItemName(id) {
    if (id.startsWith('manifest_')) {
        try {
            return `installing ${id.substring('manifest_'.length)}`;
        }
        catch (e) {
            return id;
        }
    }
    return id;
}
exports.getFriendlyItemName = getFriendlyItemName;
function gameVersionFromSemver(constraint) {
    if (constraint.endsWith('.0.0'))
        return constraint.substring(0, constraint.length - '.0.0'.length);
    return constraint;
}
class LockfileGraph {
    constructor() {
        this.nodes = new Array();
    }
    async fromLockfile(lockfile) {
        Object.keys(lockfile).forEach((entry) => {
            const node = {
                id: entry,
                version: lockfile[entry].version,
                dependencies: lockfile[entry].dependencies,
            };
            this.nodes.push(node);
        });
    }
    async validate(dependency) {
        logging_1.debug(`Validating ${dependency}`);
        const dependencyNode = this.findById(dependency);
        const dependants = this.getDependants(dependency).filter((dep) => !this.isNodeDangling(dep)); // The dangling nodes will either get removed, or will validate this node when they are validated
        const constraints = dependants.map((node) => node.dependencies[dependency]);
        const versionValid = dependencyNode && utils_1.versionSatisfiesAll(dependencyNode.version, constraints);
        if (!versionValid) {
            const friendlyItemName = await getFriendlyItemName(dependency);
            const dependantsString = (await Promise.all(dependants.map(async (dependant) => `${await getFriendlyItemName(dependant.id)} (requires ${dependant.dependencies[dependency]})`))).join(', ');
            if (dependency === 'FactoryGame') {
                if (!dependencyNode) {
                    throw new Error('This should never happen. It is here just for typescript null check');
                }
                throw new errors_1.IncompatibleGameVersion(`Game version incompatible. Installed: ${gameVersionFromSemver(dependencyNode.version)}. ${(await Promise.all(dependants.map(async (dependant) => `${await getFriendlyItemName(dependant.id)} requires ${gameVersionFromSemver(dependant.dependencies[dependency])}`))).join(', ')}`);
            }
            if (dependencyNode) {
                this.remove(dependencyNode);
            }
            const availableVersions = await ficsitApp_1.findAllVersionsMatchingAll(dependency, constraints);
            availableVersions.sort(semver_1.compare);
            let lastError = null;
            while (availableVersions.length > 0) {
                const version = availableVersions.pop();
                if (version) {
                    try {
                        const newNode = await getItemData(dependency, version);
                        try {
                            this.add(newNode);
                            await Object.keys(newNode.dependencies).forEachAsync(async (dep) => this.validate(dep));
                            return;
                        }
                        catch (e) {
                            logging_1.debug(`${dependency}@${version} is not good: ${e.message} Trace:\n${e.stack}`);
                            this.remove(newNode);
                            lastError = e;
                        }
                    }
                    catch (e) {
                        lastError = e;
                    }
                }
            }
            if (lastError
                && (lastError instanceof errors_1.IncompatibleGameVersion
                    || lastError instanceof errors_1.ModNotFoundError
                    || lastError instanceof errors_1.UnsolvableDependencyError
                    || lastError instanceof errors_1.ValidationError)) {
                throw new errors_1.ValidationError(`Error installing ${friendlyItemName}`, lastError, dependency, dependencyNode === null || dependencyNode === void 0 ? void 0 : dependencyNode.version);
            }
            const manifestNode = this.findById(`manifest_${dependency}`);
            if (manifestNode && manifestNode.dependencies[dependency] !== '>=0.0.0') {
                if (dependants.length === 1) { // Only manifest
                    throw new errors_1.ModNotFoundError(`${friendlyItemName} does not exist on ficsit.app`, dependency);
                }
                throw new errors_1.DependencyManifestMismatchError(`${friendlyItemName} is a dependency of other mods, but an incompatible version is installed by you. Please uninstall it to use a compatible version. Dependants: ${dependantsString}`, dependency, dependants.map((depNode) => ({ id: depNode.id, constraint: depNode.dependencies[dependency] })));
            }
            throw new errors_1.UnsolvableDependencyError(`No version of ${friendlyItemName} is compatible with the other installed mods. Dependants: ${dependantsString}`, dependency);
        }
    }
    toLockfile() {
        const lockfile = {};
        this.nodes.forEach((node) => {
            lockfile[node.id] = {
                version: node.version,
                dependencies: node.dependencies,
            };
        });
        return lockfile;
    }
    findById(id) {
        return this.nodes.find((node) => node.id === id);
    }
    roots() {
        return this.nodes.filter((graphNode) => this.getDependants(graphNode.id).length === 0);
    }
    getDependants(node) {
        return this.nodes.filter((graphNode) => graphNode.dependencies[node] && graphNode.id !== node);
    }
    remove(node) {
        this.nodes.remove(node);
    }
    removeWhere(cb) {
        this.nodes.removeWhere((node) => cb(node));
    }
    async add(node) {
        if (this.nodes.some((graphNode) => graphNode.id === node.id)) {
            const existingNode = this.nodes.find((graphNode) => graphNode.id === node.id);
            logging_1.debug(`Item ${await getFriendlyItemName(node.id)} already has another version installed: ${existingNode === null || existingNode === void 0 ? void 0 : existingNode.version}`);
        }
        else {
            this.nodes.push(node);
        }
    }
    static isInManifest(node) {
        return node.id.startsWith('manifest_');
    }
    isNodeDangling(node) {
        return this.getDependants(node.id).filter((dep) => !this.isNodeDangling(dep)).length === 0 && !LockfileGraph.isInManifest(node);
    }
    get _danglingCount() {
        return this.nodes.filter((node) => this.isNodeDangling(node)).length;
    }
    cleanup() {
        while (this._danglingCount > 0) {
            this.nodes.removeWhere((node) => this.isNodeDangling(node));
        }
        this.nodes.removeWhere((node) => LockfileGraph.isInManifest(node));
    }
}
exports.LockfileGraph = LockfileGraph;
async function computeLockfile(manifest, lockfile, satisfactoryVersion, update) {
    const graph = new LockfileGraph();
    await graph.fromLockfile(lockfile);
    // Convert SatisfactoryGame to FactoryGame
    await Promise.all(graph.nodes.map(async (node) => {
        if (node.dependencies['SatisfactoryGame']) {
            node.dependencies['FactoryGame'] = node.dependencies['SatisfactoryGame'];
            delete node.dependencies['SatisfactoryGame'];
        }
    }));
    // Convert items from mod ID to mod reference
    await Promise.all(graph.nodes.map(async (node, idx) => {
        const isOnFicsitApp = await ficsitApp_1.versionExistsOnFicsitApp(node.id, node.version);
        if (!isOnFicsitApp) {
            try {
                const modReference = await ficsitApp_1.getModReferenceFromId(node.id);
                graph.nodes[idx].id = modReference;
                logging_1.debug(`Converted mod ${modReference} from mod ID to mod reference in lockfile`);
            }
            catch (e) {
                if (!(e instanceof errors_1.ModNotFoundError)) {
                    throw e;
                }
            }
        }
    }));
    // Remove roots that are not in the manifest
    graph.roots().forEach((root) => {
        if (!manifest.items.some((manifestItem) => manifestItem.id === root.id && manifestItem.enabled)) {
            graph.remove(root);
        }
    });
    // Remove nodes that will be updated
    graph.removeWhere((node) => update.includes(node.id));
    const modsRemovedFromFicsitApp = await graph.nodes.filterAsync(async (node) => !(await ficsitApp_1.versionExistsOnFicsitApp(node.id, node.version)));
    modsRemovedFromFicsitApp.forEach((node) => {
        graph.remove(node);
        logging_1.info(`Trying to update mod ${node.id}, the installed version was removed from ficsit.app`);
    });
    const satisfactoryNode = {
        id: 'FactoryGame',
        version: semver_1.valid(semver_1.coerce(satisfactoryVersion)),
        dependencies: {},
    };
    graph.add(satisfactoryNode);
    await manifest.items.forEachAsync(async (item) => {
        if (item.enabled) {
            const itemData = {
                id: `manifest_${item.id}`,
                version: '0.0.0',
                dependencies: {
                    [item.id]: item.version || '>=0.0.0',
                },
            };
            await graph.add(itemData);
        }
    });
    await graph.nodes
        .map((node) => Object.keys(node.dependencies))
        .reduce((acc, cur) => acc.concat(cur))
        .filter(utils_1.unique)
        .forEachAsync(async (dep) => {
        try {
            await graph.validate(dep);
        }
        catch (e) {
            if (e instanceof errors_1.ValidationError) {
                if (modsRemovedFromFicsitApp.some((n) => n.id === e.item)) {
                    throw new errors_1.ModRemovedByAuthor(`${e.item} was installed, but no compatible version exists (probably removed by author).`, e.item, e.version);
                }
            }
            throw e;
        }
    });
    graph.cleanup();
    graph.remove(satisfactoryNode);
    return graph.toLockfile();
}
exports.computeLockfile = computeLockfile;
function readLockfile(filePath) {
    try {
        return JSON.parse(fs_1.default.readFileSync(filePath, 'utf8'));
    }
    catch (e) {
        return {};
    }
}
exports.readLockfile = readLockfile;
function writeLockfile(filePath, lockfile) {
    fs_1.default.writeFileSync(filePath, JSON.stringify(lockfile));
}
exports.writeLockfile = writeLockfile;
function getItemsList(lockfile) {
    return utils_1.mapObject(lockfile, (id, data) => [id, data.version]);
}
exports.getItemsList = getItemsList;
//# sourceMappingURL=lockfile.js.map