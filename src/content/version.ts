import versionFile from './version.json';

// One place for the versions shown on the "About" screen.
// appVersion must equal "version" in package.json (a test checks it).
// contentVersion changes whenever any other src/content/*.json file changes.
export const APP_VERSION: string = versionFile.appVersion;
export const CONTENT_VERSION: string = versionFile.contentVersion;
export const CONTENT_UPDATED_AT: string = versionFile.updatedAt;
