import { info, startGroup, endGroup, setFailed } from '@actions/core'
import * as path from 'path'
import { context, getOctokit } from '@actions/github'
// import { createCheck } from './createCheck'
import * as github from '@actions/github'
import * as fs from 'fs'
import { parseTsConfigFileToCompilerOptions } from './parseTsConfigFileToCompilerOptions'
import { getAndValidateArgs } from './getAndValidateArgs'
import { parseTsConfigFile } from './parseTsConfigFile'
import { exec } from '@actions/exec'
//import { filterErrors } from './filterErrors'
import { runTsc } from './runTsc'
import { parseOutputTsc } from './parseOutputTsc'
import { getBodyComment } from './getBodyComment'
import { checkoutAndInstallBaseBranch } from './checkoutAndInstallBaseBranch'
import { filterErrors } from './filterErrors'
import { compareErrors } from './compareErrors'

interface PullRequest {
  number: number;
  html_url?: string
  body?: string
  changed_files: number
}

async function run(): Promise<void> {
  try {
    const args = getAndValidateArgs()
    const workingDir = path.join(process.cwd(), args.directory)
    info(`working directory: ${workingDir}`)

    const tsconfigPath = path.join(workingDir, args.configPath)
    info(`tsconfigPath: ${tsconfigPath}`)
    if (!fs.existsSync(tsconfigPath)) {
      throw new Error(`could not find tsconfig.json at: ${tsconfigPath}`)
    }

    const octokit = getOctokit(args.repoToken)

    const pr = github.context.payload.pull_request

    if (!pr) {
      throw Error('Could not retrieve PR information. Only "pull_request" triggered workflows are currently supported.')
    }

    const execOptions = {
      ...(args.directory ? { cwd: args.directory } : {})
    }

    const yarnLock = fs.existsSync(path.resolve(workingDir, 'yarn.lock'))
    const packageLock = fs.existsSync(path.resolve(workingDir, 'package-lock.json'))

    let installScript = `npm install`
    if (yarnLock) {
      installScript = `yarn --frozen-lockfile`
    } else if (packageLock) {
      installScript = `npm ci`
    }

    startGroup(`[current branch] Install Dependencies`)
    info(`Installing using ${installScript}`)
    await exec(installScript, [], execOptions)
    endGroup()

    const compilerOptions = {
      ...parseTsConfigFileToCompilerOptions(tsconfigPath),
      noEmit: true
    }

    info(`[current branch] compilerOptions ${JSON.stringify(compilerOptions)}`)

    const config = parseTsConfigFile(tsconfigPath)
    info(`[current branch] config ${JSON.stringify(config)}`)

    startGroup(`[current branch] compile ts files`)

    const { output: tscOutputCurrent } = await runTsc({
      workingDir,
      tsconfigPath
    })

    const errorsProjectCurrent = parseOutputTsc(tscOutputCurrent)

    endGroup()

    startGroup(`[base branch] compile ts files`)

    checkoutAndInstallBaseBranch({
      installScript,
      payload: context.payload,
      execOptions
    })

    const { output: tscOutputBase } = await runTsc({
      workingDir,
      tsconfigPath
    })

    const errorsProjectBase = parseOutputTsc(tscOutputBase)

    endGroup()

    /*
    const finish = await createCheck(octokit, context)
    
    await finish({
      conclusion: 'success',
      output: {
        title: `Check tsc errors`,
        summary: markdownDiff
      }
    })
    */

    startGroup(`Creating comment`)

    const commentInfo = {
      ...context.repo,
      issue_number: context.payload.pull_request!.number
    }

    const errorsInPr = filterErrors(errorsProjectCurrent, args.filesChanged)

    const newErrorsInPr = compareErrors(errorsProjectBase, errorsProjectCurrent)

    const comment = {
      ...commentInfo,
      body: getBodyComment({ errorsInProjectBefore: errorsProjectBase, errorsInProjectAfter: errorsProjectCurrent, errorsInPr, newErrorsInPr })
    }

    try {
      await octokit.issues.createComment(comment)
    } catch (e) {
      info(`Error creating comment: ${e.message}`)
      info(`Submitting a PR review comment instead...`)
      try {
        const issue = context.issue || pr
        await octokit.pulls.createReview({
          owner: issue.owner,
          repo: issue.repo,
          pull_number: issue.number,
          event: 'COMMENT',
          body: comment.body
        })
      } catch (errCreateComment) {
        info(`Error creating PR review ${errCreateComment.message}`)
      }
    }

    endGroup()


  } catch (errorRun) {
    setFailed(errorRun.message)
  }
}

run()
