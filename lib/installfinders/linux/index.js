"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstalls = void 0;
const baseInstallFinder_1 = require("../baseInstallFinder");
const lutrisEpic_1 = require("./lutrisEpic");
const legendary_1 = require("./legendary");
const steam_1 = require("./steam");
const steamFlatpak_1 = require("./steamFlatpak");
async function getInstalls() {
    const lutrisEpic = lutrisEpic_1.getInstalls();
    const legendary = legendary_1.getInstalls();
    const steam = await steam_1.getInstalls();
    const steamFlatpak = await steamFlatpak_1.getInstalls();
    return baseInstallFinder_1.concatInstallFindResult(lutrisEpic, legendary, steam, steamFlatpak);
}
exports.getInstalls = getInstalls;
//# sourceMappingURL=index.js.map