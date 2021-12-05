"use strict";
/* eslint-disable no-console */
/* eslint-disable max-classes-per-file */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogFilePath = exports.toggleLogDebug = exports.setLogDebug = exports.error = exports.warn = exports.info = exports.debug = exports.write = exports.formatDateTime = exports.formatDate = exports.LogLevel = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const paths_1 = require("./paths");
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
class Logger {
    constructor() {
        this.minLevel = LogLevel.INFO;
    }
}
class ConsoleLogger extends Logger {
    constructor(minLevel) {
        super();
        this.minLevel = minLevel || LogLevel.INFO;
    }
    // eslint-disable-next-line class-methods-use-this
    write(level, message) {
        switch (level) {
            case LogLevel.DEBUG:
                console.log(message);
                break;
            case LogLevel.WARN:
                console.warn(message);
                break;
            case LogLevel.ERROR:
                console.error(message);
                break;
            case LogLevel.INFO:
            default:
                console.info(message);
                break;
        }
    }
}
function formatDate(date) {
    return `${date.getFullYear().toString().padStart(4, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}
exports.formatDate = formatDate;
class RollingFileLogger extends Logger {
    constructor(dir, fileNameFormat, minLevel) {
        super();
        this.dir = dir;
        this.fileNameFormat = fileNameFormat;
        this.minLevel = minLevel || LogLevel.DEBUG;
        this.logFileWriter = fs_1.default.createWriteStream(this.getLogFilePath(), { flags: 'a', encoding: 'utf8', autoClose: true });
    }
    static formatLogFileName(fileName) {
        return fileName.replace('%DATE%', formatDate(new Date()));
    }
    getLogFilePath() {
        return path_1.default.join(this.dir, RollingFileLogger.formatLogFileName(this.fileNameFormat));
    }
    checkRoll() {
        if (this.logFileWriter.path !== this.getLogFilePath()) {
            this.logFileWriter.end('\n');
            this.logFileWriter = fs_1.default.createWriteStream(this.getLogFilePath(), { flags: 'a', encoding: 'utf8', autoClose: true });
            this.logFileWriter.write('\n');
        }
    }
    // eslint-disable-next-line class-methods-use-this
    write(level, message) {
        this.checkRoll();
        if (this.logFileWriter && this.logFileWriter.writable) {
            this.logFileWriter.write(message);
            this.logFileWriter.write('\n');
        }
    }
}
function formatDateTime(date) {
    return `${date.getFullYear().toString().padStart(4, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}:${date.getMilliseconds().toString().padStart(3, '0')}`;
}
exports.formatDateTime = formatDateTime;
function levelToString(level) {
    switch (level) {
        case LogLevel.DEBUG:
            return 'DEBUG';
        case LogLevel.INFO:
            return 'INFO';
        case LogLevel.WARN:
            return 'WARN';
        case LogLevel.ERROR:
            return 'ERROR';
        default:
            return '';
    }
}
function formatMessage(message) {
    if (message instanceof Error) {
        return `${message.message}\nTrace\n${message.stack}`;
    }
    if (typeof message === 'string') {
        return message;
    }
    return JSON.stringify(message);
}
const loggers = [new ConsoleLogger(), new RollingFileLogger(paths_1.logsDir, `${paths_1.appName}-%DATE%.log`)];
function write(level, ...messages) {
    const formattedMessage = messages.map(formatMessage).join(' ');
    loggers.forEach((logger) => {
        if (level >= logger.minLevel) {
            logger.write(level, `${formatDateTime(new Date())}\t[${levelToString(level)}]\t${formattedMessage}`);
        }
    });
}
exports.write = write;
function debug(...messages) {
    return write(LogLevel.DEBUG, ...messages);
}
exports.debug = debug;
function info(...messages) {
    return write(LogLevel.INFO, ...messages);
}
exports.info = info;
function warn(...messages) {
    return write(LogLevel.WARN, ...messages);
}
exports.warn = warn;
function error(...messages) {
    return write(LogLevel.ERROR, ...messages);
}
exports.error = error;
function setLogDebug(d) {
    loggers[0].minLevel = d ? LogLevel.DEBUG : LogLevel.INFO; // Only change for console logger, file logger should have all debug currently
    info(`Set debug mode to ${d}`);
}
exports.setLogDebug = setLogDebug;
function toggleLogDebug() {
    if (loggers[0].minLevel === LogLevel.DEBUG) {
        setLogDebug(false);
    }
    else {
        setLogDebug(true);
    }
}
exports.toggleLogDebug = toggleLogDebug;
function getLogFilePath() {
    return loggers[1].getLogFilePath();
}
exports.getLogFilePath = getLogFilePath;
//# sourceMappingURL=logging.js.map