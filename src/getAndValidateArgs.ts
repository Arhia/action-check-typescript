import { getInput } from '@actions/core'

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
}

export function getAndValidateArgs(): Args {
  const args = {
    repoToken: getInput('repo-token', { required: true }),
    directory: getInput('directory'),
    tsConfigPath: getInput('ts-config-path'),
    filesChanged: (getInput('files-changed') ?? "").split(" "),
    filesAdded: (getInput('files-added') ?? "").split(" "),
    filesDeleted: (getInput('files-deleted') ?? "").split(" "),
    lineNumbers: JSON.parse(getInput('line-numbers')) ?? [],
    useCheck: getInput('use-check').trim() === 'true' ? true : false
  }

  return args
}
