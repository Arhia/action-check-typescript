import { getBooleanInput, getInput } from '@actions/core'

export const enum CHECK_FAIL_MODE {
  ON_ERRORS_ADDED_IN_PR = 'added',
  ON_ERRORS_PRESENT_IN_PR = 'errors_in_pr',
  ON_ERRORS_PRESENT_IN_CODE = 'errors_in_code'
}



export type Project = {
  name?: string;
  tsConfigPath: string;
}
export type Args = {
  repoToken: string
  directory: string
  projects: Project[]
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

function parseProjects(projects: string): Project[] {
  return projects.split('\n')
    .map(x => x.trim())
    .map(x => {
      const parts = x.split(':').map(y => y.trim())
      if(parts.length === 1) {
        return {
          tsConfigPath: parts[0],
        }
      } else if (parts.length === 2) {
        return {
          name: parts[0],
          tsConfigPath: parts[1],
        }
      } else {
        throw new Error(`Invalid value ${x} for input projects`)
      }
    })
}

export function getAndValidateArgs(): Args {
  const args = {
    repoToken: getInput('repo-token', { required: true, trimWhitespace: true }),
    directory: getInput('directory', { trimWhitespace: true }),
    projects: parseProjects(getInput('projects', { trimWhitespace: true, required: true })),
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
