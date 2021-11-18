import * as fs from "fs";
import * as exec from "@actions/exec";
import * as github from "@actions/github";
import { IContext } from "@octorelease/core";
import { DEFAULT_NPM_REGISTRY, utils as npmUtils } from "@octorelease/npm";
import { IPluginConfig } from "./config";

export default async function (context: IContext, config: IPluginConfig): Promise<void> {
    if (context.env.NPM_TOKEN == null) {
        throw new Error("Required environment variable NPM_TOKEN is undefined");
    }

    const baseCommitSha = github.context.payload.before;
    let publishConfig;

    try {
        await exec.exec(`git fetch origin ${baseCommitSha}`);
        const cmdOutput = await exec.getExecOutput("git", ["--no-pager", "show", `${baseCommitSha}:lerna.json`]);
        context.version.old = JSON.parse(cmdOutput.stdout).version;
    } catch {
        context.logger.warning(`Missing or invalid lerna.json in commit ${baseCommitSha}`);
    }

    try {
        const lernaJson = JSON.parse(fs.readFileSync("lerna.json", "utf-8"))
        context.version.new = lernaJson.version;
        publishConfig = lernaJson.publish;
    } catch {
        context.logger.warning(`Missing or invalid lerna.json in branch ${context.branch.name}`);
    }

    try {
        context.workspaces = JSON.parse(fs.readFileSync("package.json", "utf-8")).workspaces;
    } catch {
        context.logger.warning(`Missing or invalid package.json in branch ${context.branch.name}`);
    }

    context.branch.channel = context.branch.channel || "latest";
    await npmUtils.npmConfig(context, publishConfig?.registry || DEFAULT_NPM_REGISTRY);
}
