import * as path from "path";
import * as core from "@actions/core";
import { IProtectedBranch } from "./doc";
import * as utils from "./utils/core";
import { Config } from "./config";
import { Publish } from "./publish";
import { Version } from "./version";

async function run(): Promise<void> {
    try {
        utils.exitIfCiSkip();
        Config.load();

        const protectedBranch: IProtectedBranch = await Config.getProtectedBranch();
        const rootDir = core.getInput("root-dir");
        const versionStrategy = core.getInput("version-strategy");

        if (rootDir) {
            process.chdir(path.resolve(process.cwd(), rootDir));
        }

        if (versionStrategy === "compare" || versionStrategy === "labels") {
            await Version.version(versionStrategy, protectedBranch);
        }

        const publishJobs: { [key: string]: boolean } = {
            github: core.getInput("github-artifacts") !== "",
            npm: core.getInput("npm-token") !== "",
            vsce: core.getInput("vsce-token") !== ""
        };

        if (Object.values(publishJobs).includes(true)) {
            await Publish.prepublish();
        }

        for (const publishType of Object.keys(publishJobs)) {
            if (publishJobs[publishType]) {
                await Publish.publish(publishType as any, protectedBranch);
            }
        }
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
