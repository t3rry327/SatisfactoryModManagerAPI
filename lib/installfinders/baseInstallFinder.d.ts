import { SatisfactoryInstall } from '../satisfactoryInstall';
export interface InstallFindResult {
    installs: Array<SatisfactoryInstall>;
    invalidInstalls: Array<string>;
}
export declare function concatInstallFindResult(...items: InstallFindResult[]): InstallFindResult;
//# sourceMappingURL=baseInstallFinder.d.ts.map