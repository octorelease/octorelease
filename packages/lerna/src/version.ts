/**
 * Copyright 2020-2023 Zowe Actions Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as fs from "fs";
import * as path from "path";
import findUp from "find-up";
import { IContext, utils as coreUtils } from "@octorelease/core";
import { utils as npmUtils } from "@octorelease/npm";
import { IPluginConfig } from "./config";
import * as utils from "./utils";

export default async function (context: IContext, config: IPluginConfig): Promise<void> {
    if (context.version.old === context.version.new) {
        context.logger.info("Version in lerna.json is already up to date");
        return;
    }

    const changedPackageInfo = await utils.lernaList(true);
    const excludeDirs: string[] = [];
    if (config.versionIndependent != null) {
        const lernaJsonPath = path.join(context.rootDir, "lerna.json");
        fs.renameSync(lernaJsonPath, lernaJsonPath + ".bak");
        const lernaJson = JSON.parse(fs.readFileSync(lernaJsonPath, "utf-8"));
        lernaJson.version = "independent";
        fs.writeFileSync(lernaJsonPath, JSON.stringify(lernaJson, null, 2));
        try {
            const packageInfo = await utils.lernaList();
            for (const { name, location } of packageInfo) {
                if (!config.versionIndependent.includes(name)) {
                    continue;
                }
                if (changedPackageInfo.find(pkgInfo => pkgInfo.name === name) != null) {
                    await updateIndependentVersion(context, location, packageInfo);
                }
                excludeDirs.push(location);
            }
        } finally {
            fs.renameSync(lernaJsonPath + ".bak", lernaJsonPath);
        }
    }
    await utils.lernaVersion(context.version.new, excludeDirs);
    context.changedFiles.push("lerna.json", "package.json");
    const lockfilePath = await findUp(["yarn.lock", "npm-shrinkwrap.json", "package-lock.json"]);
    if (lockfilePath != null) {
        context.changedFiles.push(path.relative(context.rootDir, lockfilePath));
    } else {
        context.logger.warn("Could not find lockfile to update version in");
    }
    for (const { location } of changedPackageInfo) {
        const relLocation = path.relative(context.rootDir, location);
        context.changedFiles.push(path.join(relLocation, "package.json"));
    }
}

async function updateIndependentVersion(context: IContext, pkgDir: string, pkgInfo: Record<string, any>[]) {
    const semverDiff = coreUtils.getSemverDiff(context);
    const packageJson = JSON.parse(fs.readFileSync(path.join(pkgDir, "package.json"), "utf-8"));
    const oldVersion = packageJson.version.split("-")[0];
    const newVersion = semverDiff != null ? require("semver").inc(oldVersion, semverDiff) : oldVersion;
    const excludeDirs = pkgInfo.map(pkgInfo => pkgInfo.location).filter(dir => dir != pkgDir);
    await utils.lernaVersion(newVersion, excludeDirs, false);
}
