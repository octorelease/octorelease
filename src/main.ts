import * as fs from "fs";
import * as core from "@actions/core";
import { IConfig } from "./doc/IConfig";
import { IProtectedBranch } from "./doc/IProtectedBranch";
import { publishGithub, publishNpm } from "./publish";
import * as utils from "./utils";
import { version } from "./version";

async function run(): Promise<void> {
    try {
        const configFile: string = core.getInput("config-file");
        const config: IConfig = require("js-yaml").safeLoad(fs.readFileSync(configFile).toString());
        const branchNames: string[] = (config.protectedBranches || []).map((branch: IProtectedBranch) => branch.name);
        const currentBranch: string = (await utils.execAndReturnOutput("git", ["rev-parse", "--abbrev-ref", "HEAD"])).trim();

        // Check if protected branch is in config
        if (branchNames.indexOf(currentBranch) === -1) {
            core.info(`${currentBranch} is not a protected branch in ${configFile} so exiting now`);
            process.exit();
        }

        const protectedBranch = config.protectedBranches[branchNames.indexOf(currentBranch)];

        if (core.getInput("skip-version") !== "true") {
            await version(protectedBranch);
        }

        let publishJobs = false;

        if (core.getInput("github-artifacts")) {
            publishJobs = true;
            await publishGithub();
        }

        if (core.getInput("npm-credentials") && core.getInput("npm-email")) {
            publishJobs = true;
            await publishNpm(protectedBranch);
        }

        if (!publishJobs) {
            core.warning("Nothing to publish");
        }
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
