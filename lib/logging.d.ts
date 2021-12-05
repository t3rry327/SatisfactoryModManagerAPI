export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}
export declare function formatDate(date: Date): string;
export declare function formatDateTime(date: Date): string;
export declare function write(level: LogLevel, ...messages: Array<string | unknown>): void;
export declare function debug(...messages: Array<string | unknown>): void;
export declare function info(...messages: Array<string | unknown>): void;
export declare function warn(...messages: Array<string | unknown>): void;
export declare function error(...messages: Array<string | unknown>): void;
export declare function setLogDebug(d: boolean): void;
export declare function toggleLogDebug(): void;
export declare function getLogFilePath(): string;
//# sourceMappingURL=logging.d.ts.map