import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as exec from "@actions/exec";
import { IContext, utils } from "@octorelease/core";

export async function npmAddTag(context: IContext, pkgName: string, pkgVersion: string, tag: string, registry: string, inDir?: string): Promise<void> {
    const cmdArgs = ["dist-tag", "add", `${pkgName}@${pkgVersion}`, tag, "--registry", registry];
    await utils.dryRunTask(context, `npm ${cmdArgs.join(" ")}`, async () => {
        await exec.exec("npm", cmdArgs, { cwd: inDir });
    });
}

export async function npmConfig(context: IContext, registry: string): Promise<void> {
    // Add trailing slash to end of registry URL and remove protocol at start
    registry = registry.endsWith("/") ? registry : (registry + "/");
    const authLine = registry.replace(/^\w+:/, "") + ":_authToken=" + context.env.NPM_TOKEN;
    fs.appendFileSync(path.join(os.homedir(), ".npmrc"), authLine);
    await exec.exec("npm", ["whoami", "--registry", registry]);
}

export async function npmInstall(pkgName: string, pkgVersion: string, registry: string, inDir?: string): Promise<void> {
    const registrySpec = pkgName.startsWith("@") ? `${pkgName.split("/")[0]}:registry` : "registry";
    await exec.exec("npm", ["install", `${pkgName}@${pkgVersion}`, `--${registrySpec}`, registry], { cwd: inDir });
}

export async function npmPack(inDir?: string): Promise<string> {
    const cmdOutput = await exec.getExecOutput("npm", ["pack"], { cwd: inDir });
    return cmdOutput.stdout.trim();
}

export async function npmPublish(context: IContext, tag: string, registry: string, inDir?: string): Promise<void> {
    const cmdArgs = ["publish", "--tag", tag, "--registry", registry];
    await utils.dryRunTask(context, `npm ${cmdArgs.join(" ")}`, async () => {
        await exec.exec("npm", cmdArgs, { cwd: inDir });
    });
}

export async function npmVersion(newVersion: string): Promise<void> {
    await exec.exec("npm", ["version", newVersion, "--allow-same-version", "--no-git-tag-version"]);
}

export async function npmView(pkgSpec: string, property?: string): Promise<any> {
    const cmdArgs = ["view", `${pkgSpec}`, "--json"];
    if (property != null) {
        cmdArgs.push(property);
    }
    try {
        const cmdOutput = await exec.getExecOutput("npm", cmdArgs);
        return JSON.parse(cmdOutput.stdout.trim());
    } catch { /* Do nothing */ }
}
