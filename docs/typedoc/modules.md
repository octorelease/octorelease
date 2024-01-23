[@octorelease/core](README.md) / Exports

# @octorelease/core

## Table of contents

### Namespaces

- [stages](modules/stages.md)
- [utils](modules/utils.md)

### Classes

- [Inputs](classes/Inputs.md)
- [Logger](classes/Logger.md)

### Interfaces

- [IConfig](interfaces/IConfig.md)
- [IContext](interfaces/IContext.md)
- [IContextOpts](interfaces/IContextOpts.md)
- [IPlugin](interfaces/IPlugin.md)
- [IPluginsLoaded](interfaces/IPluginsLoaded.md)
- [IProtectedBranch](interfaces/IProtectedBranch.md)
- [IReleasedPackage](interfaces/IReleasedPackage.md)
- [IVersionInfo](interfaces/IVersionInfo.md)

### Type Aliases

- [BranchConfig](modules.md#branchconfig)
- [PluginConfig](modules.md#pluginconfig)

### Variables

- [SemverDiffLevels](modules.md#semverdifflevels)

## Type Aliases

### BranchConfig

Ƭ **BranchConfig**: `string` \| [`IProtectedBranch`](interfaces/IProtectedBranch.md)

Union type for branch configuration. Can be string specifying branch name
or object containing branch config.

#### Defined in

[doc/IConfig.ts:23](https://github.com/zowe-actions/octorelease/blob/3eb8460/packages/core/src/doc/IConfig.ts#L23)

___

### PluginConfig

Ƭ **PluginConfig**: `string` \| [`string`, ...Record<string, any\>[]]

Union type for plugin configuration. Can be string specifying plugin name
or array containing plugin name and one or more configuration objects.

#### Defined in

[doc/IConfig.ts:29](https://github.com/zowe-actions/octorelease/blob/3eb8460/packages/core/src/doc/IConfig.ts#L29)

## Variables

### SemverDiffLevels

• `Const` **SemverDiffLevels**: readonly [``"none"``, ``"patch"``, ``"minor"``, ``"major"``]

List of semver diff levels supported by Octorelease

#### Defined in

[doc/IProtectedBranch.ts:20](https://github.com/zowe-actions/octorelease/blob/3eb8460/packages/core/src/doc/IProtectedBranch.ts#L20)
