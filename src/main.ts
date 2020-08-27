import * as core from '@actions/core'
import * as github from '@actions/github'
import {GitHub} from '@actions/github/lib/utils'

type GithubClient = InstanceType<typeof GitHub>

type Args = {
  repoToken: string
}

async function run(): Promise<void> {
  try {
    const args = getAndValidateArgs()
    core.info('Starting GitHub Client')

    core.info('Starting GitHub Client')
    const client = github.getOctokit(args.repoToken)

    const pr = github.context.payload.pull_request

    if (!pr) {
      throw Error(
        'Could not retrieve PR information. Only "pull_request" triggered workflows are currently supported.'
      )
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()

function getAndValidateArgs(): Args {
  const args = {
    repoToken: core.getInput('repo-token', {required: true})
  }

  return args
}
