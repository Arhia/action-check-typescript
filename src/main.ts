import { info, startGroup, endGroup, setFailed, warning, error } from '@actions/core'
import * as path from 'path'
import { context, getOctokit } from '@actions/github'
import { createCheck } from './createCheck'
import * as github from '@actions/github'
import * as fs from 'fs'
import { parseTsConfigFileToCompilerOptions } from './tsc/parseTsConfigFileToCompilerOptions'
import { getAndValidateArgs } from './getAndValidateArgs'
import { exec } from '@actions/exec'
import { getBodyComment } from './getBodyComment'
import { checkoutAndInstallBaseBranch } from './checkoutAndInstallBaseBranch'
import { compareErrors } from './compareErrors'
import { compileTsFiles } from './tsc/compileTsFiles'
import { getFilesToCompile } from './getFilesToCompile'

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

    startGroup(`[current branch] compile ts files`)

    const rootDir = `.`
    const rootPath = path.resolve(rootDir)

    const fileNames = getFilesToCompile({
      workingDir: '.',
      include: ['**/*.ts'],
      exclude: ['node_modules']
    })
    if (!fileNames.length) {
      error(`[current branch] Aucun fichier trouvé correspondant aux patterns `)
    }

    const errorsPr = compileTsFiles({
      rootNames: fileNames,
      rootPath,
      tsOptions: compilerOptions
    })

    info(`[current branch] ts errors :\n ${JSON.stringify(errorsPr)}`)

    endGroup()

    startGroup(`[base branch] compile ts files`)

    await checkoutAndInstallBaseBranch({
      installScript,
      payload: context.payload,
      execOptions
    })

    const fileNamesBase = getFilesToCompile({
      workingDir: '.',
      include: ['**/*.ts'],
      exclude: ['node_modules']
    })
    if (!fileNamesBase.length) {
      error(`[base branch] Aucun fichier trouvé correspondant aux patterns `)
    }
    const errorsBaseBranch = compileTsFiles({
      rootPath,
      rootNames: fileNamesBase,
      tsOptions: compilerOptions
    })

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

    const isPrOk = !errorsInModifiedFiles.length

    if (args.useCheck) {
      const finish = await createCheck(octokit, context, "Check ts errors")

      if (isPrOk) {
        await finish({
          conclusion: 'success',
          output: {
            title: `No tsc error in the PR files.`,
            summary: `No tsc error in the PR files.`
          }
        })
      } else {
        await finish({
          conclusion: 'failure',
          output: {
            title: `${errorsInModifiedFiles.length} tsc error in the PR files.`,
            summary: `${errorsInModifiedFiles.length} tsc error in the PR files.`
          }
        })
      }
    }

  } catch (errorRun) {
    setFailed(errorRun.message)
  }
}

run()
