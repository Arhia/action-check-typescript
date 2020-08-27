import { getInput } from '@actions/core'

type Args = {
  repoToken: string
  directory: string
  configPath: string
}

export function getAndValidateArgs(): Args {
  const args = {
    repoToken: getInput('repo-token', { required: true }),
    directory: getInput('directory'),
    configPath: getInput('config-path')
  }

  return args
}
