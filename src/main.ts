import { info, startGroup, endGroup, setFailed } from '@actions/core'
import * as path from 'path'
import { context, getOctokit } from '@actions/github'
import { createCheck } from './createCheck'
import * as github from '@actions/github'
import * as fs from 'fs'
import { parseTsConfigFile } from './tscHelpers/parseTsConfigFileToCompilerOptions'
import { getAndValidateArgs, CHECK_FAIL_MODE } from './getAndValidateArgs'
import { exec } from '@actions/exec'
import { getBodyComment } from './getBodyComment'
import { checkoutAndInstallBaseBranch } from './checkoutAndInstallBaseBranch'
import { compareErrors } from './compareErrors'
import { runTscCli } from './tscHelpers/runTscCli'
import { parseOutputTsc } from './tscHelpers/parseOutputTsc'

export type ErrorTs = {
  fileName: string
  line: number
  column: number
  fileNameResolved: string
  code: number
  severity?: string
  message: string
  /** for long error messages */
  extraMsg?: string
}
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

    const tsconfigPath = path.join(workingDir, args.tsConfigPath)
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

    let installScript = `npm install --production=false`
    if (yarnLock) {
      installScript = `yarn --frozen-lockfile`
    } else if (packageLock) {
      installScript = `npm ci`
    }

    const rootDir = `.`
    const rootPath = path.resolve(rootDir)

    info(`rootPath : ${rootPath}`)

    // ***********************************************************************************************
    //                                                  PR
    // ***********************************************************************************************
    startGroup(`[current branch] Install Dependencies`)
    info(`Installing using ${installScript}`)
    await exec(installScript, [], execOptions)
    endGroup()

    startGroup(`[current branch] compile ts files`)

    const { rawParsing: rawParsingPr } = parseTsConfigFile(tsconfigPath)

    info(`[current branch] : tsconfig raw parsing :\n ${JSON.stringify(rawParsingPr)}`)

    const { output: tscOutputCurrent } = await runTscCli({
      workingDir,
      tsconfigPath
    })

    const errorsPr = parseOutputTsc(tscOutputCurrent)

    info(`[current branch] : ${errorsPr.length} error(s) detected`)

    const ansiColorsCode = {
      magenta: '\u001b[35m',
      cyan: '\u001b[38;5;6m',
      red: '\u001b[38;2;255;0;0m'
    }

    if (args.debug) {
      info(`${ansiColorsCode.cyan}[current branch] all errors: \n${JSON.stringify(errorsPr)}`)
    }

    endGroup()

    // ***********************************************************************************************
    //                                              BASE BRANCH
    // ***********************************************************************************************

    startGroup(`[base branch] compile ts files`)

    await checkoutAndInstallBaseBranch({
      installScript,
      payload: context.payload,
      execOptions
    })

    const { output: tscOutputBase } = await runTscCli({
      workingDir,
      tsconfigPath
    })

    const errorsBaseBranch = parseOutputTsc(tscOutputBase)

    info(`[base branch] : ${errorsBaseBranch.length} error(s) detected`)

    if (args.debug) {
      info(`${ansiColorsCode.cyan}[base branch] all errors: \n${JSON.stringify(errorsBaseBranch)}`)
    }

    endGroup()

    startGroup(`Comparing errors`)

    const resultCompareErrors = compareErrors({
      errorsBefore: errorsBaseBranch,
      errorsAfter: errorsPr,
      filesChanged: args.filesChanged,
      filesAdded: args.filesAdded,
      filesDeleted: args.filesDeleted,
      lineNumbers: args.lineNumbers
    })

    if (args.debug) {
      info(`${ansiColorsCode.cyan}Contenu de resultCompareErrors : ${JSON.stringify(resultCompareErrors)}`)
    }

    const errorsInModifiedFiles = errorsPr.filter(err => {
      return args.filesChanged.concat(args.filesAdded).includes(err.fileName)
    })

    info(`${errorsInModifiedFiles.length} errors in modified files`)

    const newErrorsInModifiedFiles = resultCompareErrors.errorsAdded.filter(err => {
      return args.filesChanged.concat(args.filesAdded).includes(err.fileName)
    })

    info(`${newErrorsInModifiedFiles.length} added errors in modified files`)

    endGroup()

    startGroup(`Creating comment`)

    const commentInfo = {
      ...context.repo,
      issue_number: context.payload.pull_request!.number
    }

    const comment = {
      ...commentInfo,
      body: getBodyComment({
        errorsInProjectBefore: errorsBaseBranch,
        errorsInProjectAfter: errorsPr,
        newErrorsInProject: resultCompareErrors.errorsAdded,
        errorsInModifiedFiles,
        newErrorsInModifiedFiles
      })
    }
    info(`comment body obtained`)

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

    info(`comment created`)

    endGroup()

    let shouldFailCheck = false
    let title = ''
    let summary = ''

    if (args.checkFailMode === CHECK_FAIL_MODE.ON_ERRORS_ADDED_IN_PR) {
      shouldFailCheck = resultCompareErrors.errorsAdded.length > 0
      if (shouldFailCheck) {
        title = `${errorsInModifiedFiles.length} ts errors added by this PR.`
        summary = `${errorsInModifiedFiles.length} ts errors added by this PR.`
      } else {
        title = `No ts errors added.`
        summary = `No ts errors added.`
      }
    } else if (args.checkFailMode === CHECK_FAIL_MODE.ON_ERRORS_PRESENT_IN_PR) {
      shouldFailCheck = errorsInModifiedFiles.length > 0
      if (shouldFailCheck) {
        title = `${errorsInModifiedFiles.length} ts errors present in modified files.`
        summary = `${errorsInModifiedFiles.length} ts errors present in modified files.`
      } else {
        title = `No ts errors present in modified files.`
        summary = `No ts errors present in modified files.`
      }
    } else if (args.checkFailMode === CHECK_FAIL_MODE.ON_ERRORS_PRESENT_IN_CODE) {
      shouldFailCheck = errorsPr.length > 0
      if (shouldFailCheck) {
        title = `${errorsInModifiedFiles.length} ts errors present in the PR branch.`
        summary = `${errorsInModifiedFiles.length} ts errors present in the PR branch.`
      } else {
        title = `No ts errors present in the PR branch.`
        summary = `No ts errors present in the PR branch.`
      }
    }

    if (args.useCheck) {
      const finish = await createCheck(octokit, context, "Check ts errors")

      await finish({
        conclusion: shouldFailCheck ? 'failure' : 'success',
        output: {
          title: title,
          summary: summary
        }
      })

    }


  } catch (errorRun) {
    setFailed(errorRun.message)
  }
}

run()
