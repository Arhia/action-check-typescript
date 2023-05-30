<p align="center">
  <a href="https://github.com/actions/typescript-action/actions"><img alt="typescript-action status" src="https://github.com/actions/typescript-action/workflows/build-test/badge.svg"></a>
</p>

# action-check-typescript

`action-check-typescript` is a GitHub action designed to compile TypeScript files and display the errors found throughout the entire codebase as well as in files changed in pull requests (PRs).

This action is currently used in production at [Arhia](https://github.com/Arhia).

## Features

- Detects and utilizes `yarn` or `npm ci` automatically when lockfiles are detected
- Builds your PR, then runs `tsc` to detect any errors 🔍
- Compares TypeScript errors between the base branch and PR branch to identify new errors (automatically handles line number offsets) 💪
- Does not upload any data or rely on centralized storage 👐

## Usage

`action-check-typescript` relies on two other actions (big thanks to the authors ! ❤️) to:

- `Equip-Collaboration/diff-line-numbers`: Retrieve line numbers of added and removed lines in changed files.
- `futuratrepadeira/changed-files`: List files added, modified, and deleted.

To use `action-check-typescript`, add a workflow (for example, `.github/workflows/check_ts.yml`):

```yaml
name: check-ts
on:
  pull_request:
jobs:
  ts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Get diff lines
        id: diff
        uses: Equip-Collaboration/diff-line-numbers@v1.0.0
        with:
          include: '["\\.ts$"]'
      - name: Detecting files changed
        id: files
        uses: umani/changed-files@v4.0.0
        with:
          repo-token: ${{ github.token }}
          pattern: '^.*\.ts$'
      - name: List files changed (you can remove this step, for monitoring only)
        run: |
          echo 'Files modified: ${{steps.files.outputs.files_updated}}'
          echo 'Files added: ${{steps.files.outputs.files_created}}'
          echo 'Files removed: ${{steps.files.outputs.files_deleted}}'
      - uses: Arhia/action-check-typescript@v1.1.0
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          use-check: true
          check-fail-mode: added
          files-changed: ${{steps.files.outputs.files_updated}}
          files-added: ${{steps.files.outputs.files_created}}
          files-deleted: ${{steps.files.outputs.files_deleted}}
          line-numbers: ${{steps.diff.outputs.lineNumbers}}
          output-behaviour: both
          comment-behaviour: new
```

## Customizing the Check

By default, this action does not perform a status check (i.e., pass or fail).

You need to set `use-check` to `true` to enable a status check:

```yaml
use-check: true
```

The determination of check status is based on the value of `check-fail-mode`.

| Value            | Behaviour                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| `added`          | Check fails if some errors are added in the files added/modified in the PR branch.                                   |
| `errors_in_pr`   | Check fails if any errors are present in the files added/modified in the PR branch (even if already in base branch). |
| `errors_in_code` | Check fails if any errors are present in the entire branch.                                                          |

The output behaviour is determined by the value of `output-behaviour`:

| Value      | Behaviour                                                        |
| ---------- | ---------------------------------------------------------------- |
| `comment`  | Default, comments on the PR with the errors found for this run.  |
| `annotate` | Uses GitHub line annotations with the errors found for this run. |
| `both`     | Does both of the above.                                          |

The comment behaviour depends on the value of `comment-behaviour`:

| Value  | Behaviour                                                                         |
| ------ | --------------------------------------------------------------------------------- |
| `new`  | Default, adds a new comment for every run of the action.                          |
| `edit` | Updates a previous run's comment, if one exists, otherwise creates a new comment. |

## Using a Specific tsconfig File

By default, this action uses the tsconfig file located at `./tsconfig.json`.

If you need to use a different file for this action to change the behavior of `tsc`, you can create a specific tsconfig file (e.g., `tsconfig.check.json`) and set the `ts-config-path` parameter accordingly:

```yml
ts-config-path: "./tsconfig.check.json"
```

For instance, if you use `watch:true` in your regular tsconfig file, you should disable the watching mode for this action.
