import * as path from "path";
import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as github from "@actions/github";
import { cosmiconfig } from "cosmiconfig";
import { IContext, IPluginsLoaded } from "./doc";

export async function buildContext(): Promise<IContext | undefined> {
    const config = await cosmiconfig("release").search();
    if (config == null || config.isEmpty) {
        throw new Error("Failed to load config because file does not exist or is empty");
    }

    const branchName = github.context.payload.pull_request?.base.ref || github.context.ref.replace(/^refs\/heads\//, "");
    const micromatch = require("micromatch");
    const branches = config.config.branches.map((branch: any) => typeof branch === "string" ? { name: branch } : branch);
    const branchIndex = branches.findIndex((branch: any) => micromatch.isMatch(branchName, branch.name));
    if (branchIndex == -1) {
        return;
    } else if (branchIndex > 0 && branches[branchIndex].channel == null) {
        branches[branchIndex].channel = branches[branchIndex].name;
    }

    const pluginConfig: Record<string, Record<string, any>> = {};
    for (const pc of config.config.plugins) {
        if (typeof pc === "string") {
            pluginConfig[pc] = {};
        } else {
            pluginConfig[pc[0]] = pc[1];
        }
    }

    return {
        branch: branches[branchIndex],
        changedFiles: [],
        dryRun: core.getBooleanInput("dry-run"),
        env: process.env as any,
        plugins: pluginConfig,
        version: {}
    };
}

export async function loadPlugins(context: IContext): Promise<IPluginsLoaded> {
    const pluginsLoaded: IPluginsLoaded = {};
    for (const pluginName in context.plugins) {
        const pluginPath = (pluginName.startsWith("./") ? "" : "./node_modules/") + pluginName;
        pluginsLoaded[pluginName] = require(path.resolve(pluginPath));
    }
    return pluginsLoaded;
}

export async function verifyConditions(context: IContext): Promise<void> {
    if (context.version.old == null) {
        const latestGitTag = (await exec.getExecOutput("git", ["describe", "--abbrev=0"])).stdout.trim();
        if (latestGitTag) {
            context.version.old = latestGitTag.slice(1);
        }
    }

    context.version.new = context.version.new || context.version.old;
    const semverDiff = require("semver").diff(context.version.old, context.version.new);

    if ((semverDiff === "major" && (context.branch.level === "minor" || context.branch.level === "patch")) ||
            (semverDiff === "minor" && context.branch.level === "patch")) {
        throw new Error(`Protected branch ${context.branch.name} does not allow ${semverDiff} version changes`);
    }

    if (context.branch.prerelease && context.version.new != null) {
        const prereleaseName = (typeof context.branch.prerelease === "string") ? context.branch.prerelease : context.branch.name;
        const timestamp = (new Date()).toISOString().replace(/\D/g, "").slice(0, 12);
        context.version.new = `${context.version.new.split("-")[0]}-${prereleaseName}.${timestamp}`;
    }
}
