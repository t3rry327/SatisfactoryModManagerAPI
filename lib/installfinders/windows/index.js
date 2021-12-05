"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstalls = void 0;
const baseInstallFinder_1 = require("../baseInstallFinder");
const epic_1 = require("./epic");
const steam_1 = require("./steam");
async function getInstalls() {
    const epic = epic_1.getInstalls();
    const steam = await steam_1.getInstalls();
    return baseInstallFinder_1.concatInstallFindResult(epic, steam);
}
exports.getInstalls = getInstalls;
//# sourceMappingURL=index.js.map