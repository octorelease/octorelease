import * as fs from "fs";
import * as path from "path";
import * as core from "@actions/core";
import * as github from "@actions/github";
import * as semver from "semver";
import { IContext } from "./doc/IContext";
import * as utils from "./utils";

export class Version {
    public static async version(context: IContext): Promise<[string, string]> {
        const jsonFile = context.config.publishConfig.includes("lerna") ? "lerna.json" : "package.json";
        const currentVersion: string = JSON.parse(fs.readFileSync(jsonFile, "utf-8")).version;
        const semverLevel = await this.checkPrForSemverLabel(context);
        let newVersion = semver.inc(currentVersion, semverLevel as any) || currentVersion;

        if (context.branch.prerelease) {
            const prereleaseName = (typeof context.branch.prerelease === "string") ? context.branch.prerelease : context.branch.name;
            const timestamp = (new Date()).toISOString().replace(/\D/g, "").slice(0, 12);
            newVersion = `${newVersion.split("-")[0]}-${prereleaseName}.${timestamp}`;
        }

        if ((semverLevel === "major" && (context.branch.level === "minor" || context.branch.level === "patch")) ||
                (semverLevel === "minor" && context.branch.level === "patch")) {
            throw new Error(`Protected branch ${context.branch.name} does not allow ${semverLevel} version changes`);
        }

        const changedFiles = ["package.json", "package-lock.json"];

        if (context.config.publishConfig.includes("lerna")) {
            await utils.lernaVersion(newVersion);
            changedFiles.push("lerna.json");

            for (const { location } of (await utils.lernaList()).filter(pkg => pkg.changed)) {
                const pkgRoot = path.relative(process.cwd(), location);
                const changelogFile = path.join(pkgRoot, "CHANGELOG.md");
                this.updateChangelog(changelogFile, newVersion);
                changedFiles.push(`${pkgRoot}/CHANGELOG.md`, `${pkgRoot}/package.json`);
            }
        } else {
            await utils.npmVersion(newVersion);
            this.updateChangelog("CHANGELOG.md", newVersion);
            changedFiles.push("CHANGELOG.md");
        }

        await utils.gitAdd(...changedFiles);
        await utils.gitCommit(`Bump version to ${newVersion}`);
        await utils.gitTag(`v${newVersion}`, `Release ${newVersion} to ${context.branch.tag}`);
        await utils.gitPush(context.branch.name, true);

        return [currentVersion, newVersion];
    }

    private static async checkPrForSemverLabel(context: IContext): Promise<string | null> {
        const octokit = github.getOctokit(context.github.token);
        const prs = await octokit.repos.listPullRequestsAssociatedWithCommit({
            ...context.repository,
            commit_sha: context.github.sha
        });

        if (prs.data.length === 0) {
            core.warning(`Could not find pull request associated with commit ${context.github.sha}`);
            return null;
        }

        const labels = await octokit.issues.listLabelsOnIssue({
            ...context.repository,
            issue_number: prs.data[0].number
        });
        const releaseLabels = labels.data.filter(label => label.name.startsWith("release-"));

        if (releaseLabels.length > 1) {
            throw new Error("Detected multiple semver labels on pull request, there should only be one");
        }

        switch (releaseLabels[0].name) {
            case "release-major":
                return "major";
            case "release-minor":
                return "minor";
            case "release-patch":
                return "patch";
            default:
                core.warning("Could not find semver label on pull request");
                return null;
        }
    }

    private static updateChangelog(changelogFile: string, newVersion: string): void {
        if (fs.existsSync(changelogFile)) {
            const oldContents = fs.readFileSync(changelogFile, "utf-8");
            const searchValue = "## Recent Changes";
            const replaceValue = `## \`${newVersion}\``;
            const newContents = oldContents.replace(searchValue, replaceValue);
    
            if (newContents !== oldContents) {
                fs.writeFileSync(changelogFile, newContents);
                core.info(`Updated version header in ${changelogFile}`)
            }
        }
    }
}
