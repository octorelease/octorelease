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

import { IContext, utils as coreUtils } from "@octorelease/core";
import { IPluginConfig } from "./config";
import * as utils from "./utils";

export default async function (context: IContext, config: IPluginConfig): Promise<void> {
    if (Object.keys(context.releasedPackages).length === 0) {
        return;
    }

    const octokit = utils.getOctokit(context, config);
    const prs = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
        ...context.ci.repo,
        commit_sha: context.ci.commit
    });
    if (prs.data.length === 0) {
        return;
    }

    await coreUtils.dryRunTask(context, "add released label to pull request", async () => {
        await octokit.rest.issues.addLabels({
            ...context.ci.repo,
            issue_number: prs.data[0].number,
            labels: ["released"]
        });
    });

    const packageList: string[] = [];
    for (const pkgType of Object.keys(context.releasedPackages)) {
        for (const { name, url } of context.releasedPackages[pkgType]) {
            const pkgName = url != null ? `[${name}](${url})` : `\`${name}\``;
            packageList.push(`**${pkgType}**: ${pkgName}`);
        }
    }
    await coreUtils.dryRunTask(context, "create success comment on pull request", async () => {
        await octokit.rest.issues.createComment({
            ...context.ci.repo,
            issue_number: prs.data[0].number,
            body: `Release succeeded for the \`${context.branch.name}\` branch. :tada:\n\n` +
                `The following packages have been published:\n` +
                packageList.map(line => `* ${line}`).join("\n") + `\n\n` +
                `<sub>Powered by Octorelease :rocket:</sub>`
        });
    });
}
