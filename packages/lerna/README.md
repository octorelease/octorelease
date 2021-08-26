# Lerna plugin

Octorelease plugin for monorepo to perform actions related to NPM.

| Step | Description |
|------|-------------|
| `init` | Load version numbers from lerna.json and login to NPM registry. |
| `version` | Bump changed package versions with lerna CLI. |
| `publish` | Publish the new package versions to NPM registry. |
| `success` | Verify that new package versions can be installed successfully. |
