"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstalls = void 0;
const windows_1 = require("./windows");
const linux_1 = require("./linux");
async function getInstalls() {
    if (process.platform === 'win32') {
        return windows_1.getInstalls();
    }
    if (process.platform === 'linux') {
        return linux_1.getInstalls();
    }
    return { installs: [], invalidInstalls: [] };
}
exports.getInstalls = getInstalls;
//# sourceMappingURL=index.js.map