"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.concatInstallFindResult = void 0;
function concatInstallFindResult(...items) {
    return {
        installs: items.map((item) => item.installs).flat(),
        invalidInstalls: items.map((item) => item.invalidInstalls).flat(),
    };
}
exports.concatInstallFindResult = concatInstallFindResult;
//# sourceMappingURL=baseInstallFinder.js.map