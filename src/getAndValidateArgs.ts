import { getBooleanInput, getInput } from '@actions/core'

export const enum CHECK_FAIL_MODE {
  ON_ERRORS_ADDED_IN_PR = 'added',
  ON_ERRORS_PRESENT_IN_PR = 'errors_in_pr',
  ON_ERRORS_PRESENT_IN_CODE = 'errors_in_code'
}
type Args = {
  repoToken: string
  directory: string
  tsConfigPath: string
  filesChanged: string[]
  filesAdded: string[]
  filesDeleted: string[]
  /**
   * @example
   * [{
   *         "path": "src/getAndValidateArgs.ts",
   *         "added": [
   *             6,
   *             15,
   *             17
   *         ],
   *         "removed": [
   *             6,
   *             15
   *         ]
   *     },
   *     {
   *         "path": "src/getBodyComment.ts",
   *         "added": [],
   *         "removed": [
   *             1,
   *             2
   *         ]
   *     }
   * ] 
   */
  lineNumbers: { path: string, added: number[], removed: number[] }[]
  useCheck: boolean
  checkFailMode: CHECK_FAIL_MODE,
  outputSummaryErrors: boolean;
  debug: boolean
}

export function getAndValidateArgs(): Args {
  const args = {
    repoToken: getInput('repo-token', { required: true, trimWhitespace: true }),
    directory: getInput('directory', { trimWhitespace: true }),
    tsConfigPath: getInput('ts-config-path', { trimWhitespace: true, required: true }),
    filesChanged: (getInput('files-changed') ?? "").split(" "),
    filesAdded: (getInput('files-added') ?? "").split(" "),
    filesDeleted: (getInput('files-deleted') ?? "").split(" "),
    lineNumbers: JSON.parse(getInput('line-numbers')) ?? [],
    useCheck: getBooleanInput('use-check'),
    checkFailMode: getInput('check-fail-mode') as CHECK_FAIL_MODE,
    outputSummaryErrors: getBooleanInput('output-summary-errors'),
    debug: getBooleanInput('debug')
  }

  if (![
    CHECK_FAIL_MODE.ON_ERRORS_ADDED_IN_PR,
    CHECK_FAIL_MODE.ON_ERRORS_PRESENT_IN_CODE,
    CHECK_FAIL_MODE.ON_ERRORS_PRESENT_IN_PR
  ].includes(args.checkFailMode)) {
    throw new Error(`Invalid value ${args.checkFailMode} for input check-fail-mode`)
  }

  return args
}
