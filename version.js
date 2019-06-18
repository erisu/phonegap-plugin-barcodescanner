/**
 * Release Steps
 *
 * // This line bumps the package for a `major` release and store the version in the environment variable `PACKAGE_RELEASE_VERSION`.
 * // If you  plan to release anything other then `major`, change the cli argument `major` to the desired release target.
 * // Other valid options are `patch` or `minor`.
 * export PACKAGE_RELEASE_VERSION=$(npm --no-git-tag-version version major | head -n 1)
 *
 * // NOTE!: this script will execute after `npm` runs the `version` bump process. This script handle the `plugin.xml` file updates.
 *
 * // Remove the `package-lock.json` file before adding and commiting to repo. This file is current not commited to repo.
 * rm -rf package-lock.json
 *
 * // Add, commit, create tag, and push to master + tag
 * git add .
 * git commit -S -m ":bookmark: Bump release version ${PACKAGE_RELEASE_VERSION}"
 * git tag ${PACKAGE_RELEASE_VERSION}
 * git push origin master --tags
 *
 * // Run the version script to append suffix `-dev`
 * npm run version -- --dev
 *
 * // Add, commit, and push to master `-dev` suffix.
 * git add .
 * git commit -S -m "Set -dev suffix"
 * git push origin master
 */
const path = require('path');
const { existsSync, readFileSync, writeFileSync } = require('fs');
const { parseString, Builder } = require('xml2js');
const nopt = require('nopt');
const pkgJsonPath = path.resolve(require.main.path, 'package.json');
const pkgJson = require(pkgJsonPath);
const pkgJsonLockPath = path.resolve(require.main.path, 'package-lock.json');
const plguinXmlPath = path.resolve(require.main.path, 'plugin.xml');
const args = nopt({ dev: Boolean }, {}, process.argv, 0);

if (existsSync(plguinXmlPath)) {
    const plguinXml = readFileSync(plguinXmlPath);
    parseString(plguinXml, (err, result) => {
        if (err) console.log(err);

        // Update with dev prefix
        if (args.dev) {
            pkgJson.version = `${pkgJson.version}-dev`;
        }

        // Update plugin.xml
        result.plugin.$.version = pkgJson.version;

        if (args.dev && existsSync(pkgJsonLockPath)) {
            // Get package-lock
            const packageLock = require(pkgJsonLockPath);

            // Update only the package version
            packageLock.version = pkgJson.version;

            // Write it back out
            writeFileSync(
                pkgJsonLockPath,
                JSON.stringify(packageLock, null, 2) + '\n',
                'utf8'
            );
        }

        const builder = new Builder();
        const xml = builder.buildObject(result);

        // Write out updatetd plugin.xml
        writeFileSync(plguinXmlPath, xml + '\n');

        if (args.dev) {
            // Write out changed package.json with the -dev prefix
            writeFileSync(
                pkgJsonPath,
                JSON.stringify(pkgJson, null, 2) + '\n',
                'utf8'
            );
        }
    });
}
