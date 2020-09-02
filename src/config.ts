import * as fs from "fs";
import * as core from "@actions/core";
import * as github from "@actions/github";
import { IConfig, IProtectedBranch } from "./doc";
import * as utils from "./utils";

export class Config {
    private mConfig: IConfig | null = null;

    private mConfigFile: string;

    constructor() {
        this.mConfigFile = core.getInput("config-file");

        if (fs.existsSync(this.mConfigFile)) {
            this.mConfig = require("js-yaml").safeLoad(fs.readFileSync(this.mConfigFile, "utf-8"));
        } else {
            core.info(`Config file ${this.mConfigFile} not found so continuing with default config`);
        }
    }

    public async getProtectedBranch(currentBranch: string): Promise<IProtectedBranch> {
        // Use default config if config file not found
        if (this.mConfig == null) {
            return { name: currentBranch };
        }

        const branchNames: string[] = this.mConfig.protectedBranches.map(branch => branch.name);
        const minimatch = require("minimatch");
        const branchIndex: number = branchNames.findIndex((branch) => minimatch(currentBranch, branch));

        // Check if branch is missing in config
        if (branchIndex === -1) {
            core.info(`${currentBranch} is not a listed branch in ${this.mConfigFile} so exiting now`);
            process.exit();
        }

        const [owner, repo] = utils.requireEnvVar("GITHUB_REPOSITORY").split("/", 2);
        const octokit = github.getOctokit(core.getInput("repo-token"));
        const branchData = await octokit.repos.getBranch({
            owner, repo,
            branch: currentBranch
        });

        // Check if branch is unprotected
        if (!branchData.data.protected) {
            core.info(`${currentBranch} is not a protected branch in GitHub so exiting now`);
            process.exit();
        }

        return this.renderBranchName({
            ...this.mConfig.protectedBranches[branchIndex],
            name: currentBranch
        }, currentBranch);
    }

    private renderBranchName(obj: any, branchName: string): any {
        return JSON.parse(JSON.stringify(obj), (key, value) => {
            return (typeof value === "string") ? value.replace("${name}", branchName) : value;
        });
    }
}
