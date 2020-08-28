import { getInput } from '@actions/core'

type Args = {
  repoToken: string
  directory: string
  configPath: string
  filesChanged: string
  useCheck: boolean
}

export function getAndValidateArgs(): Args {
  const args = {
    repoToken: getInput('repo-token', { required: true }),
    directory: getInput('directory'),
    configPath: getInput('config-path'),
    filesChanged: getInput('files-changed'),
    useCheck: getInput('use-check').trim() === 'true' ? true : false
  }

  return args
}
