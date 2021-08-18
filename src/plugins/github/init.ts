import * as core from "@actions/core";
import * as github from "@actions/github";
import { IContext } from "../../doc";
import { IPluginConfig } from "./config";

export default async function (context: IContext, config: IPluginConfig): Promise<void> {
    if (context.env.GITHUB_TOKEN == null) {
        throw new Error("Required environment variable GITHUB_TOKEN is undefined");
    }

    if (config.checkPrLabels) {
        const releaseType = await getPrReleaseType(context);
        if (releaseType != null) {
            context.version.new = require("semver").inc(context.version.old, releaseType);
        }
    }
}

async function getPrReleaseType(context: IContext): Promise<string | null> {
    const octokit = github.getOctokit(context.env.GITHUB_TOKEN);
    const prs = await octokit.repos.listPullRequestsAssociatedWithCommit({
        ...github.context.repo,
        commit_sha: github.context.sha
    });

    if (prs.data.length === 0) {
        core.warning(`Could not find pull request associated with commit ${github.context.sha}`);
        return null;
    }

    const prNumber = prs.data[0].number;
    const labels = await octokit.issues.listLabelsOnIssue({
        ...github.context.repo,
        issue_number: prNumber
    });
    const releaseLabels = labels.data.filter(label => label.name.startsWith("release-"));

    if (releaseLabels.length > 1) {
        throw new Error("Detected multiple semver labels on pull request, there should only be one");
    }

    switch (releaseLabels[0]?.name) {
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
