<p align="center">
  <a href="https://github.com/actions/typescript-action/actions"><img alt="typescript-action status" src="https://github.com/actions/typescript-action/workflows/build-test/badge.svg"></a>
</p>

# action-check-typescript  

A Github action that compile ts files and display the errors found in whole codebase and in files changed in PR.  

**Used in production at [Arhia](https://github.com/Arhia)**  

- Automatically uses `yarn` or `npm ci` when lockfiles are present
- Builds your PR, then run tsc to detect errors  🔍 
- Compare ts errors in base branch and in PR branch to detect new errors (handle automatically line numbers offset)  💪
- Doesn't upload anything or rely on centralized storage  👐 

## Usage

action-check-typescript rely on two other actions (big thanks to the authors ! ❤️) to : 
- Equip-Collaboration/diff-line-numbers : retrieve line numbers of added and removed lines in files changed
- futuratrepadeira/changed-files : list files added, modified and deleted

Add a workflow (eg `.github/workflows/check_ts.yml`):

```yaml
name: 'check-ts'
on:
  pull_request:
jobs:
  ts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Get diff lines
        id: diff
        uses: Equip-Collaboration/diff-line-numbers@v1.0.0
        with:
          include: '["\\.ts$"]'
      - name: Detecting files changed
        id: files
        uses: futuratrepadeira/changed-files@v3.2.1
        with:
          repo-token: ${{ github.token }}
          pattern: '^.*\.ts$'
      - name: List files changed (you can remove this step, for monitoring only)
        run: |
          echo 'Files modified: ${{steps.files.outputs.files_updated}}'
          echo 'Files added: ${{steps.files.outputs.files_created}}'
          echo 'Files removed: ${{steps.files.outputs.files_deleted}}'
      - uses: Arhia/action-check-typescript@v2.0
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          use-check: true
          check-fail-mode: added
          files-changed: ${{steps.files.outputs.files_updated}}
          files-added: ${{steps.files.outputs.files_created}}
          files-deleted: ${{steps.files.outputs.files_deleted}}
          line-numbers: ${{steps.diff.outputs.lineNumbers}}
```
## Customize the check  

By default, this action doesn't perform a status check (aka pass/fail).  

You need to set `use-check` on true to run a status check.    

```yaml
  use-check: true
```

How the check status is determined depends on the value of `check-fail-mode`  

Value|Behaviour
-- | -- 
`added`| Check fails if some errors are added in the files added/modified in the PR branch.  
`errors_in_pr`| Check fails if any errors are present in the files added/modified in the PR branch (even if already in base branche).  
`errors_in_code`| Check fails if any errors are present in the whole branch.  

The output behaviour depends on the value of `output-behaviour`

Value|Behaviour
-- | --
`comment` | Default, comments on the PR with the errors found for this run.
`annotate` | Uses github line annotations with the errors found for this run.
`both` | Does both of the above.

## Use a specific tsconfig file

By default, this actions uses tsconfig file located at './tsconfig.json'   

You may want to use a different file for this action, in order to change tsc behaviour.  
For example, if you use `watch:true` in your regular tsconfig file, you should disable watching mode.  

In order to do this, you would create a specific tsconfig file (eg name `tsconfig.check.ts`) and setting accordingly the
parameter `ts-config-path` : 

```yml
  ts-config-path: './tsconfig.check.json'
```
