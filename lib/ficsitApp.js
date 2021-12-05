"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.existsOnFicsitApp = exports.versionExistsOnFicsitApp = exports.findAllVersionsMatchingAll = exports.getLatestBootstrapperVersion = exports.getBootstrapperVersionInfo = exports.getLatestSMLVersion = exports.getSMLVersionInfo = exports.getAvailableBootstrapperVersions = exports.getSMLVersion = exports.getAvailableSMLVersions = exports.findVersionMatchingAll = exports.getModLatestVersion = exports.getModVersion = exports.getModVersions = exports.refetchVersions = exports.getManyModVersions = exports.getModName = exports.getMod = exports.getModReferenceFromId = exports.getAvailableMods = exports.MODS_PER_PAGE = exports.getModsCount = exports.getModDownloadLink = exports.fiscitApiQuery = exports.removeTempModVersion = exports.removeTempMod = exports.addTempModVersion = exports.addTempMod = exports.setTempModReference = exports.getUseTempMods = exports.setUseTempMods = void 0;
const semver_1 = require("semver");
const graphql_1 = require("graphql");
const graphql_tag_1 = __importDefault(require("graphql-tag"));
const core_1 = require("@apollo/client/core");
const persisted_queries_1 = require("@apollo/client/link/persisted-queries");
const apollo_link_scalars_1 = require("apollo-link-scalars");
const sha_js_1 = __importDefault(require("sha.js"));
const graphql_scalars_1 = require("graphql-scalars");
const utils_1 = require("./utils");
const errors_1 = require("./errors");
const logging_1 = require("./logging");
const graphql_schema_json_1 = __importDefault(require("./__generated__/graphql.schema.json"));
const API_URL = 'https://api.ficsit.app';
const GRAPHQL_API_URL = `${API_URL}/v2/query`;
const link = core_1.ApolloLink.from([
    apollo_link_scalars_1.withScalars({
        schema: graphql_1.buildClientSchema(graphql_schema_json_1.default),
        typesMap: {
            Date: {
                ...graphql_scalars_1.DateTimeResolver,
                parseValue(value) {
                    if (typeof value !== 'string' || value) {
                        return graphql_scalars_1.DateTimeResolver.parseValue(value);
                    }
                    return null;
                },
                parseLiteral(value, variables) {
                    if (typeof value !== 'string' || value) {
                        return graphql_scalars_1.DateTimeResolver.parseLiteral(value, variables);
                    }
                    return null;
                },
                serialize(value) {
                    if (value instanceof Date) {
                        return value.toISOString();
                    }
                    return value;
                },
            },
        },
    }),
    persisted_queries_1.createPersistedQueryLink({ useGETForHashedQueries: true, sha256: (...args) => sha_js_1.default('sha256').update(args.toString()).digest('hex') }),
    core_1.createHttpLink({
        uri: GRAPHQL_API_URL,
        headers: {
            'User-Agent': utils_1.UserAgent,
        },
    }),
]);
const client = new core_1.ApolloClient({
    cache: new core_1.InMemoryCache(),
    link,
});
let useTempMods = false; // TODO: remove once more mods are updated so live data can be used for tests instead
/**
 * This function should be used for debugging purposes only!
 * @param enable if true enables temporary mods usage
 */
function setUseTempMods(enable) {
    useTempMods = enable;
    if (useTempMods) {
        logging_1.warn('Enabling temporary mods. This feature should be used for debugging purposes only!');
    }
}
exports.setUseTempMods = setUseTempMods;
function getUseTempMods() {
    return useTempMods;
}
exports.getUseTempMods = getUseTempMods;
const tempMods = [];
const allTempModReferences = [];
function setTempModReference(modID, mod_reference) {
    const tempMod = tempMods.find((mod) => mod.id === modID);
    if (tempMod) {
        allTempModReferences.remove(tempMod.mod_reference);
        allTempModReferences.push(mod_reference);
        tempMod.mod_reference = mod_reference;
    }
}
exports.setTempModReference = setTempModReference;
function addTempMod(mod) {
    if (useTempMods) {
        const fixedMod = mod;
        fixedMod.versions = fixedMod.versions.map((ver) => {
            const tmpVer = ver;
            tmpVer.created_at = new Date(0, 0, 0, 0, 0, 0, 0);
            return tmpVer;
        });
        if (!fixedMod.name) {
            fixedMod.name = fixedMod.id;
        }
        if (!fixedMod.mod_reference) {
            fixedMod.mod_reference = fixedMod.id;
        }
        tempMods.push(fixedMod);
        allTempModReferences.push(mod.mod_reference);
    }
    else {
        logging_1.warn('Temporary mods are only available in debug mode');
    }
}
exports.addTempMod = addTempMod;
function addTempModVersion(version) {
    if (useTempMods) {
        const tempMod = tempMods.find((mod) => mod.mod_reference === version.mod_id);
        if (tempMod) {
            const fixedVersion = version;
            fixedVersion.created_at = new Date(0, 0, 0, 0, 0, 0, 0);
            tempMod.versions.push(fixedVersion);
        }
    }
    else {
        logging_1.warn('Temporary mods are only available in debug mode');
    }
}
exports.addTempModVersion = addTempModVersion;
function removeTempMod(modReference) {
    if (useTempMods) {
        tempMods.removeWhere((mod) => mod.mod_reference === modReference);
    }
    else {
        logging_1.warn('Temporary mods are only available in debug mode');
    }
}
exports.removeTempMod = removeTempMod;
function removeTempModVersion(modReference, version) {
    if (useTempMods) {
        const mod = tempMods.find((tempMod) => tempMod.mod_reference === modReference);
        if (mod) {
            mod.versions.removeWhere((modVersion) => modVersion.version === version);
        }
    }
    else {
        logging_1.warn('Temporary mods are only available in debug mode');
    }
}
exports.removeTempModVersion = removeTempModVersion;
async function fiscitApiQuery(query, variables, options) {
    try {
        const response = await client.query({
            query,
            variables,
            fetchPolicy: (options === null || options === void 0 ? void 0 : options.fetchPolicy) || 'cache-first',
        });
        return response;
    }
    catch (e) {
        logging_1.error(`Error getting data from ficsit.app: ${e.message}. Trace:\n${e.stack}`);
        throw new errors_1.NetworkError('Network error. Please try again later.', e.statusCode);
    }
}
exports.fiscitApiQuery = fiscitApiQuery;
async function getModDownloadLink(modReference, version) {
    if (allTempModReferences.includes(modReference)) {
        const tempMod = tempMods.find((mod) => mod.mod_reference === modReference);
        if (tempMod) {
            const tempModVersion = tempMod.versions.find((ver) => ver.version === version);
            if (tempModVersion) {
                return tempModVersion.link;
            }
        }
        throw new errors_1.ModNotFoundError(`Temporary mod ${modReference}@${version} not found`, modReference, version);
    }
    const res = await fiscitApiQuery(graphql_tag_1.default `
    query($modReference: ModReference!, $version: String!){
      getModByReference(modReference: $modReference)
      {
        id,
        version(version: $version)
        {
          id,
          link
        }
      }
    }
    `, { modReference, version });
    if (res.errors) {
        throw res.errors;
    }
    else if (res.data && res.data.getModByReference && res.data.getModByReference.version) {
        return API_URL + res.data.getModByReference.version.link;
    }
    else {
        throw new errors_1.ModNotFoundError(`${modReference}@${version} not found`, modReference, version);
    }
}
exports.getModDownloadLink = getModDownloadLink;
async function getModsCount() {
    const res = await fiscitApiQuery(graphql_tag_1.default `
  query {
    getMods {
      count
    }
  }
  `);
    if (res.errors) {
        throw res.errors;
    }
    else {
        return res.data.getMods.count;
    }
}
exports.getModsCount = getModsCount;
exports.MODS_PER_PAGE = 50;
async function getAvailableMods(page) {
    const res = await fiscitApiQuery(graphql_tag_1.default `
    query($limit: Int!, $offset: Int!){
      getMods(filter: {
        limit: $limit,
        offset: $offset
      })
      {
        mods
        {
          id,
          name,
          mod_reference,
          short_description,
          full_description,
          logo,
          views,
          downloads,
          hotness,
          popularity,
          created_at,
          last_version_date,
          authors
          {
            mod_id,
            user
            {
              id,
              username,
              avatar
            },
            role
          },
          versions
          {
            id,
            mod_id,
            version,
            sml_version,
            changelog,
            downloads,
            stability,
            created_at,
            link,
            size,
            hash,
            dependencies
            {
              mod_id,
              condition,
              optional
            }
          }
        }
      }
    }
  `, {
        offset: page * exports.MODS_PER_PAGE,
        limit: exports.MODS_PER_PAGE,
    });
    if (res.errors) {
        throw res.errors;
    }
    else {
        const resGetMods = res.data.getMods.mods;
        if (page === 0 && useTempMods) {
            resGetMods.push(...tempMods);
        }
        return resGetMods;
    }
}
exports.getAvailableMods = getAvailableMods;
async function getModReferenceFromId(modID) {
    const res = await fiscitApiQuery(graphql_tag_1.default `
    query($modID: ModID!){
      getMod(modId: $modID)
      {
        id,
        mod_reference,
      }
    }
    `, {
        modID,
    });
    if (res.errors) {
        throw res.errors;
    }
    else {
        const resGetMod = res.data.getMod;
        if (!resGetMod) {
            if (useTempMods) {
                const tempMod = tempMods.find((mod) => mod.id === modID);
                if (tempMod) {
                    return tempMod.mod_reference;
                }
            }
            throw new errors_1.ModNotFoundError(`Mod ${modID} not found`, modID);
        }
        return resGetMod.mod_reference;
    }
}
exports.getModReferenceFromId = getModReferenceFromId;
async function getMod(modReference) {
    const res = await fiscitApiQuery(graphql_tag_1.default `
    query($modReference: ModReference!){
      getModByReference(modReference: $modReference)
      {
        id,
        name,
        mod_reference,
        short_description,
        full_description,
        logo,
        views,
        downloads,
        hotness,
        popularity,
        created_at,
        last_version_date,
        authors
        {
          mod_id,
          user
          {
            id,
            username,
            avatar
          },
          role
        },
        versions
        {
          id,
          mod_id,
          version,
          sml_version,
          changelog,
          downloads,
          stability,
          created_at,
          link,
          size,
          hash,
          dependencies
          {
            mod_id,
            condition,
            optional
          }
        }
      }
    }
    `, {
        modReference,
    });
    if (res.errors) {
        throw res.errors;
    }
    else {
        const resGetMod = res.data.getModByReference;
        if (!resGetMod) {
            if (useTempMods) {
                const tempMod = tempMods.find((mod) => mod.mod_reference === modReference);
                if (tempMod) {
                    return tempMod;
                }
            }
            throw new errors_1.ModNotFoundError(`Mod ${modReference} not found`, modReference);
        }
        return resGetMod;
    }
}
exports.getMod = getMod;
async function getModName(modReference) {
    const res = await fiscitApiQuery(graphql_tag_1.default `
    query($modReference: ModReference!){
      getModByReference(modReference: $modReference)
      {
        id,
        name
      }
    }
    `, {
        modReference,
    });
    if (res.errors) {
        throw res.errors;
    }
    else {
        const resGetMod = res.data.getModByReference;
        if (!resGetMod) {
            if (useTempMods) {
                const tempMod = tempMods.find((mod) => mod.mod_reference === modReference);
                if (tempMod) {
                    return tempMod.name;
                }
            }
            throw new errors_1.ModNotFoundError(`Mod ${modReference} not found`, modReference);
        }
        return resGetMod.name;
    }
}
exports.getModName = getModName;
async function getManyModVersions(modReferences) {
    const res = await fiscitApiQuery(graphql_tag_1.default `
    query($references: [String!]) {
      getMods(filter: { limit: 100, references: $references }) {
        mods {
          id,
          mod_reference,
          versions(filter: {
              limit: 100
            })
          {
            id,
            mod_id,
            version,
            sml_version,
            changelog,
            downloads,
            stability,
            created_at,
            link,
            size,
            hash,
            dependencies
            {
              mod_id,
              condition,
              optional
            }
          }
        }
      }
    }
    `, {
        references: modReferences,
    }, {
        fetchPolicy: 'network-only',
    });
    if (res.errors) {
        throw res.errors;
    }
    else if (res.data.getMods) {
        return res.data.getMods.mods;
    }
    else {
        return [];
    }
}
exports.getManyModVersions = getManyModVersions;
async function refetchVersions() {
    const modCount = await getModsCount();
    const modPages = Math.ceil(modCount / exports.MODS_PER_PAGE);
    const mods = (await Promise.all(Array.from({ length: modPages }).map(async (_, i) => getAvailableMods(i))))
        .flat(1);
    await Promise.all(Array.from({ length: modPages })
        .map(async (_, i) => getManyModVersions(mods.slice(i * exports.MODS_PER_PAGE, (i + 1) * exports.MODS_PER_PAGE).map((mod) => mod.mod_reference))));
}
exports.refetchVersions = refetchVersions;
async function getModVersions(modReference) {
    const res = await fiscitApiQuery(graphql_tag_1.default `
    query($modReference: ModReference!){
      getModByReference(modReference: $modReference)
      {
        id,
        versions(filter: {
            limit: 100
          })
        {
          id,
          mod_id,
          version,
          sml_version,
          changelog,
          downloads,
          stability,
          created_at,
          link,
          size,
          hash,
          dependencies
          {
            mod_id,
            condition,
            optional
          }
        }
      }
    }
    `, {
        modReference,
    });
    if (res.errors) {
        throw res.errors;
    }
    else if (res.data.getModByReference) {
        return res.data.getModByReference.versions;
    }
    else {
        if (useTempMods) {
            const tempMod = tempMods.find((mod) => mod.mod_reference === modReference);
            if (tempMod) {
                return tempMod.versions;
            }
        }
        throw new errors_1.ModNotFoundError(`Mod ${modReference} not found`, modReference);
    }
}
exports.getModVersions = getModVersions;
async function getModVersion(modReference, version) {
    const res = await fiscitApiQuery(graphql_tag_1.default `
    query($modReference: ModReference!, $version: String!){
      getModByReference(modReference: $modReference)
      {
        id,
        version(version: $version)
        {
          id,
          mod_id,
          version,
          sml_version,
          changelog,
          downloads,
          stability,
          created_at,
          link,
          size,
          hash,
          dependencies
          {
            mod_id,
            condition,
            optional
          }
        }
      }
    }
    `, {
        modReference,
        version,
    });
    if (res.errors) {
        throw res.errors;
    }
    else if (res.data.getModByReference) {
        if (!res.data.getModByReference.version) {
            throw new errors_1.ModNotFoundError(`Mod ${modReference}@${version} not found`, modReference, version);
        }
        return res.data.getModByReference.version;
    }
    else {
        if (useTempMods) {
            const tempMod = tempMods.find((mod) => mod.mod_reference === modReference);
            if (tempMod) {
                const tempVer = tempMod.versions.find((ver) => ver.version === version);
                if (tempVer) {
                    return tempVer;
                }
            }
        }
        throw new errors_1.ModNotFoundError(`Mod ${modReference} not found`, modReference);
    }
}
exports.getModVersion = getModVersion;
async function getModLatestVersion(modReference) {
    const versions = await getModVersions(modReference);
    versions.sort((a, b) => -semver_1.compare(a.version, b.version));
    return versions[0];
}
exports.getModLatestVersion = getModLatestVersion;
async function findVersionMatchingAll(modReference, versionConstraints) {
    const versions = await getModVersions(modReference);
    let finalVersion = '';
    let found = false;
    versions.forEach((modVersion) => {
        if (!found && utils_1.versionSatisfiesAll(modVersion.version, versionConstraints)) {
            found = true;
            finalVersion = modVersion.version;
        }
    });
    return found ? finalVersion : undefined;
}
exports.findVersionMatchingAll = findVersionMatchingAll;
const smlVersionIDMap = {};
async function getAvailableSMLVersions() {
    const res = await fiscitApiQuery(graphql_tag_1.default `
    query{
      getSMLVersions(filter: {limit: 100})
      {
        sml_versions
        {
          id,
          version,
          satisfactory_version
          stability,
          link,
          changelog,
          date,
          bootstrap_version
        }
      }
    }
  `);
    if (res.errors) {
        throw res.errors;
    }
    else {
        // filter SML versions supported by SMManager
        const smlVersionsCompatible = res.data.getSMLVersions.sml_versions.filter((version) => semver_1.satisfies(version.version, '>=2.0.0'));
        smlVersionsCompatible.forEach((ver) => {
            const validVersion = semver_1.valid(semver_1.coerce(ver.version));
            if (validVersion)
                smlVersionIDMap[validVersion] = ver.id;
        });
        return smlVersionsCompatible;
    }
}
exports.getAvailableSMLVersions = getAvailableSMLVersions;
async function getSMLVersion() {
    const res = await fiscitApiQuery(graphql_tag_1.default `
    query($versionID: SMLVersionID!){
      getSMLVersion(smlVersionID: $versionID)
      {
        id,
        version,
        satisfactory_version
        stability,
        link,
        changelog,
        date,
        bootstrap_version
      }
    }
  `);
    if (res.errors) {
        throw res.errors;
    }
    else {
        return res.data.getSMLVersion;
    }
}
exports.getSMLVersion = getSMLVersion;
const bootstrapperVersionIDMap = {};
async function getAvailableBootstrapperVersions() {
    const res = await fiscitApiQuery(graphql_tag_1.default `
    query {
      getBootstrapVersions(filter: {limit: 100})
      {
        bootstrap_versions
        {
          id,
          version,
          satisfactory_version,
          stability,
          link,
          changelog,
          date
        }
      }
    }
  `);
    if (res.errors) {
        throw res.errors;
    }
    else {
        res.data.getBootstrapVersions.bootstrap_versions.forEach((ver) => {
            const validVersion = semver_1.valid(semver_1.coerce(ver.version));
            if (validVersion)
                bootstrapperVersionIDMap[validVersion] = ver.id;
        });
        return res.data.getBootstrapVersions.bootstrap_versions;
    }
}
exports.getAvailableBootstrapperVersions = getAvailableBootstrapperVersions;
async function getSMLVersionInfo(version) {
    const validVersion = semver_1.valid(semver_1.coerce(version));
    if (!validVersion)
        throw new Error(`Invalid SML version ${version}`);
    if (!smlVersionIDMap[validVersion]) {
        return (await getAvailableSMLVersions()).find((smlVersion) => smlVersion.version === version);
    }
    const versionID = smlVersionIDMap[validVersion];
    const res = await fiscitApiQuery(graphql_tag_1.default `
  query($versionID: SMLVersionID!){
    getSMLVersion(smlVersionID: $versionID)
    {
      id,
      version,
      satisfactory_version
      stability,
      link,
      changelog,
      date,
      bootstrap_version
    }
  }
  `, {
        versionID,
    });
    if (res.errors) {
        throw res.errors;
    }
    else {
        return res.data.getSMLVersion;
    }
}
exports.getSMLVersionInfo = getSMLVersionInfo;
async function getLatestSMLVersion() {
    const versions = await getAvailableSMLVersions();
    versions.sort((a, b) => -semver_1.compare(a.version, b.version));
    return versions[0];
}
exports.getLatestSMLVersion = getLatestSMLVersion;
async function getBootstrapperVersionInfo(version) {
    const validVersion = semver_1.valid(semver_1.coerce(version));
    if (!validVersion)
        throw new Error(`Invalid bootstrapper version ${version}`);
    if (!smlVersionIDMap[validVersion]) {
        return (await getAvailableBootstrapperVersions()).find((bootstrapperVersion) => bootstrapperVersion.version === version);
    }
    const versionID = bootstrapperVersionIDMap[validVersion];
    const res = await fiscitApiQuery(graphql_tag_1.default `
  query($versionID: BootstrapVersionID!){
    getBootstrapVersion(bootstrapVersionID: $versionID)
    {
      id,
      version,
      satisfactory_version
      stability,
      link,
      changelog,
      date,
    }
  }
  `, {
        versionID,
    });
    if (res.errors) {
        throw res.errors;
    }
    else {
        return res.data.getSMLVersion;
    }
}
exports.getBootstrapperVersionInfo = getBootstrapperVersionInfo;
async function getLatestBootstrapperVersion() {
    const versions = await getAvailableBootstrapperVersions();
    versions.sort((a, b) => -semver_1.compare(a.version, b.version));
    return versions[0];
}
exports.getLatestBootstrapperVersion = getLatestBootstrapperVersion;
async function findAllVersionsMatchingAll(item, versionConstraints) {
    if (item === utils_1.SMLID) {
        const smlVersions = await getAvailableSMLVersions();
        return smlVersions
            .filter((smlVersion) => semver_1.satisfies(smlVersion.version, `>=${utils_1.minSMLVersion}`))
            .filter((smlVersion) => utils_1.versionSatisfiesAll(smlVersion.version, versionConstraints))
            .map((smlVersion) => smlVersion.version);
    }
    if (item === utils_1.BootstrapperID) {
        const bootstrapperVersions = await getAvailableBootstrapperVersions();
        return bootstrapperVersions
            .filter((bootstrapperVersion) => utils_1.versionSatisfiesAll(bootstrapperVersion.version, versionConstraints))
            .map((bootstrapperVersion) => bootstrapperVersion.version);
    }
    const versions = await getModVersions(item);
    return versions
        .filter((modVersion) => utils_1.versionSatisfiesAll(modVersion.version, versionConstraints))
        .map((modVersion) => modVersion.version);
}
exports.findAllVersionsMatchingAll = findAllVersionsMatchingAll;
async function versionExistsOnFicsitApp(id, version) {
    if (id === utils_1.SMLID) {
        return !!(await getSMLVersionInfo(version));
    }
    if (id === utils_1.BootstrapperID) {
        return !!(await getBootstrapperVersionInfo(version));
    }
    if (id === 'FactoryGame') {
        return true;
    }
    try {
        return !!await getModVersion(id, version);
    }
    catch (e) {
        if (e instanceof errors_1.ModNotFoundError) {
            return false;
        }
        throw e;
    }
}
exports.versionExistsOnFicsitApp = versionExistsOnFicsitApp;
async function existsOnFicsitApp(id) {
    if (id === utils_1.SMLID || id === utils_1.BootstrapperID) {
        return true;
    }
    try {
        return !!await getModName(id);
    }
    catch (e) {
        if (e instanceof errors_1.ModNotFoundError) {
            return false;
        }
        throw e;
    }
}
exports.existsOnFicsitApp = existsOnFicsitApp;
//# sourceMappingURL=ficsitApp.js.map