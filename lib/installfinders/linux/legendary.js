"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstalls = void 0;
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const logging_1 = require("../../logging");
const satisfactoryInstall_1 = require("../../satisfactoryInstall");
const LEGENDARY_DATA_PATH = `${process.env.HOME}/.config/legendary/installed.json`;
function getInstalls() {
    const installs = [];
    const invalidInstalls = [];
    if (fs_1.default.existsSync(LEGENDARY_DATA_PATH)) {
        const legendaryInstalls = JSON.parse(fs_1.default.readFileSync(LEGENDARY_DATA_PATH, 'utf8'));
        Object.values(legendaryInstalls).forEach((legendaryGame) => {
            if (legendaryGame.app_name.includes('Crab')) {
                let canLaunch = false;
                try {
                    child_process_1.execSync('legendary', { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' });
                    canLaunch = true;
                }
                catch (e) {
                    // legendary executable not found
                }
                installs.push(new satisfactoryInstall_1.SatisfactoryInstall(`${legendaryGame.title} (Legendary)`, legendaryGame.version, legendaryGame.app_name.substr('Crab'.length), legendaryGame.install_path, canLaunch ? `legendary launch ${legendaryGame.app_name}` : undefined));
            }
        });
        return { installs, invalidInstalls };
    }
    logging_1.debug('Legendary is not installed');
    return { installs: [], invalidInstalls: [] };
}
exports.getInstalls = getInstalls;
//# sourceMappingURL=legendary.js.map