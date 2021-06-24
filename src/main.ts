import { info, startGroup, endGroup, setFailed, error } from '@actions/core'
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
import { compileTsFiles } from './tscHelpers/compileTsFiles'

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

    const rootDir = `src`
    const rootPath = path.resolve(rootDir)

    // ***********************************************************************************************
    //                                                  PR
    // ***********************************************************************************************
    startGroup(`[current branch] Install Dependencies`)
    info(`Installing using ${installScript}`)
    await exec(installScript, [], execOptions)
    endGroup()

    startGroup(`[current branch] compile ts files`)

    const { compilerOptions: compilerOptionsPr, fileNames: rootNamesPr, rawParsing: rawParsingPr, projectReferences: projectReferencesPr } = parseTsConfigFile(tsconfigPath)

    info(`[current branch] : tsconfig raw parsing :\n ${JSON.stringify(rawParsingPr)}`)

    if (!rootNamesPr.length) {
      error(`[current branch] Aucun fichier trouvé à compiler `)
    }

    info(`[current branch] : rootNames :\n ${rootNamesPr.join('\n')}`)

    const finalCompilerOptionsPr = {
      ...compilerOptionsPr,
      noEmit: true
    }

    const errorsPr = compileTsFiles({
      rootNames: rootNamesPr,
      rootPath,
      tscOptions: finalCompilerOptionsPr,
      projectReferences: projectReferencesPr
    })

    info(`[current branch] ts errors :\n ${JSON.stringify(errorsPr)}`)

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

    const { compilerOptions: compilerOptionsBase, fileNames: rootNamesBase, projectReferences: projectReferencesBase } = parseTsConfigFile(tsconfigPath)

    const finalCompilerOptionsBase = {
      ...compilerOptionsBase,
      noEmit: true
    }

    const errorsBaseBranch = compileTsFiles({
      rootPath,
      rootNames: rootNamesBase,
      projectReferences: projectReferencesBase,
      tscOptions: finalCompilerOptionsBase
    })

    info(`[base branch] ts errors :\n ${JSON.stringify(errorsPr)}`)

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

    info(`Contenu de resultCompareErrors : ${JSON.stringify(resultCompareErrors)}`)

    const errorsInModifiedFiles = errorsPr.filter(err => {
      return args.filesChanged.concat(args.filesAdded).includes(err.fileName)
    })

    const newErrorsInModifiedFiles = resultCompareErrors.errorsAdded.filter(err => {
      return args.filesChanged.concat(args.filesAdded).includes(err.fileName)
    })

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
