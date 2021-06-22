import { getInput } from '@actions/core'

type Args = {
  repoToken: string
  directory: string
  tsConfigPath: string
  filesChanged: string
  useCheck: boolean
}

export function getAndValidateArgs(): Args {
  const args = {
    repoToken: getInput('repo-token', { required: true }),
    directory: getInput('directory'),
    tsConfigPath: getInput('ts-config-path'),
    filesChanged: getInput('files-changed', { required: true }),
    lineNumbers: getInput('line-numbers', { required: true }),
    useCheck: getInput('use-check').trim() === 'true' ? true : false
  }

  return args
}
