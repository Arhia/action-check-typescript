import { info, startGroup, endGroup, setFailed } from '@actions/core'
import * as path from 'path'
import { context, getOctokit } from '@actions/github'
import { createCheck } from './createCheck'
import * as github from '@actions/github'
import * as fs from 'fs'
import { parseTsConfigFile } from './tscHelpers/parseTsConfigFileToCompilerOptions'
import { getAndValidateArgs, CHECK_FAIL_MODE, Project, Args } from './getAndValidateArgs'
import { exec } from '@actions/exec'
import { getBodyComment } from './getBodyComment'
import { checkoutAndInstallBaseBranch } from './checkoutAndInstallBaseBranch'
import { compareErrors, CompareErrorsInput } from './compareErrors'
import { runTscCli } from './tscHelpers/runTscCli'
import { parseOutputTsc } from './tscHelpers/parseOutputTsc'

export type ErrorTs = {
  fileName: string
  line: string
  column: string
  fileNameResolved?: string
  code: string
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

export interface ProcessedProject extends Project {
  name: string;
  fullTsConfigPath: string;
}
function processProjects(workingDir: string, projects: Project[]): ProcessedProject[] {
  return projects.map((proj) => {

    const tsconfigPath = path.join(workingDir, proj.tsConfigPath)
    info(`tsconfigPath: ${tsconfigPath}`)
    if (!fs.existsSync(tsconfigPath)) {
      throw new Error(`could not find tsconfig.json at: ${tsconfigPath}`)
    }
    return {
      ...proj,
      name: proj.name ?? proj.tsConfigPath,
      fullTsConfigPath: tsconfigPath,
    }
  })
}

interface CompilerOutput {
  project: ProcessedProject;
  errors: ErrorTs[];
}

interface CompileArgs {
  debug: boolean;
  workingDir: string;
  branch: 'current' | 'base';
}

const ansiColorsCode = {
  magenta: '\u001b[35m',
  cyan: '\u001b[38;5;6m',
  red: '\u001b[38;2;255;0;0m'
}
async function compileProject(args: CompileArgs, project: ProcessedProject): Promise<CompilerOutput> {
  const tsconfigPath = project.fullTsConfigPath
  const { rawParsing: rawParsingPr } = parseTsConfigFile(tsconfigPath)

  info(`[${args.branch} branch] : ${project.name} tsconfig raw parsing :\n ${JSON.stringify(rawParsingPr)}`)

  const { output: tscOutputCurrent } = await runTscCli({
    workingDir: args.workingDir,
    tsconfigPath
  })

  const errors = parseOutputTsc(tscOutputCurrent)

  info(`[${args.branch} branch] : ${project.name} ${errors.length} error(s) detected`)


  if (args.debug) {
    info(`${ansiColorsCode.cyan}[${args.branch} branch] ${project.name} all errors: \n${JSON.stringify(errors)}`)
  }
  return {
    errors,
    project,
  }
}

interface ProjectResult {
  errorsInProjectBefore: ErrorTs[]
  errorsInProjectAfter: ErrorTs[]
  newErrorsInProject: ErrorTs[]
  errorsInModifiedFiles: ErrorTs[]
  newErrorsInModifiedFiles: ErrorTs[]
  project: ProcessedProject;
}

interface BuildResultInputs extends CompareErrorsInput {
  project: ProcessedProject
  debug: boolean
}

function buildProjectResult(args: BuildResultInputs): ProjectResult {
  const project = args.project
  const resultCompareErrors = compareErrors(args)

  if (args.debug) {
    info(`${ansiColorsCode.cyan}[${project.name}] Contents of resultCompareErrors : ${JSON.stringify(resultCompareErrors)}`)
  }

  const errorsInModifiedFiles = args.errorsAfter.filter(err => {
    return args.filesChanged.concat(args.filesAdded).includes(err.fileName)
  })

  info(`[${project.name}] ${errorsInModifiedFiles.length} errors in modified files`)

  const newErrorsInModifiedFiles = resultCompareErrors.errorsAdded.filter(err => {
    return args.filesChanged.concat(args.filesAdded).includes(err.fileName)
  })

  info(`[${project.name}] ${newErrorsInModifiedFiles.length} added errors in modified files`)

  return {
    errorsInProjectBefore: args.errorsBefore,
    errorsInProjectAfter: args.errorsAfter,
    errorsInModifiedFiles,
    newErrorsInModifiedFiles,
    newErrorsInProject: resultCompareErrors.errorsAdded,
    project: args.project,
  }
}

function aggregateResults(results: ProjectResult[]): Omit<ProjectResult, 'project'> {
  const [first, ...rest] = results
  return rest.reduce((acc, next) => {
    acc.errorsInModifiedFiles.push(...next.errorsInModifiedFiles)
    acc.errorsInProjectAfter.push(...next.errorsInProjectAfter)
    acc.errorsInProjectBefore.push(...next.errorsInProjectBefore)
    acc.newErrorsInModifiedFiles.push(...next.newErrorsInModifiedFiles)
    acc.newErrorsInProject.push(...next.newErrorsInProject)
    return acc
  }, first)
}

function determineFailure(checkFailMode: CHECK_FAIL_MODE, results: Omit<ProjectResult, 'project'>): {
  shouldFailCheck: boolean;
  title: string;
  summary: string;
} {
  if (checkFailMode === CHECK_FAIL_MODE.ON_ERRORS_ADDED_IN_PR) {
    const { newErrorsInProject } = results
    const shouldFailCheck = newErrorsInProject.length > 0
    if (shouldFailCheck) {
      return {
        shouldFailCheck,
        title:`${newErrorsInProject.length} ts errors added by this PR.`,
        summary: `${newErrorsInProject.length} ts errors added by this PR.`,
      }
    }
    return {
      shouldFailCheck,
      title: `No ts errors added.`,
      summary: `No ts errors added.`,
    }
  } else if (checkFailMode === CHECK_FAIL_MODE.ON_ERRORS_PRESENT_IN_PR) {
    const { errorsInModifiedFiles } = results
    const shouldFailCheck = errorsInModifiedFiles.length > 0
    if (shouldFailCheck) {
      return {
        shouldFailCheck,
        title: `${errorsInModifiedFiles.length} ts errors present in modified files.`,
        summary: `${errorsInModifiedFiles.length} ts errors present in modified files.`,
      }
    }
    return {
      shouldFailCheck,
      title: `No ts errors in modified files.`,
      summary: `No ts errors in modified files.`,
    }
  } else if (checkFailMode === CHECK_FAIL_MODE.ON_ERRORS_PRESENT_IN_CODE) {
    const { errorsInProjectAfter } = results
    const shouldFailCheck = errorsInProjectAfter.length > 0
    if (shouldFailCheck) {
      return {
        shouldFailCheck,
        title: `${errorsInProjectAfter.length} ts errors in the PR branch.`,
        summary: `${errorsInProjectAfter.length} ts errors in the PR branch.`,
      }
    } 
    return {
      shouldFailCheck,
      title: `No ts errors in the PR branch.`,
      summary: `No ts errors in the PR branch.`,
    }
  }
  return {
    shouldFailCheck: false,
    title: '',
    summary: ''
  }
}
async function run(): Promise<void> {
  try {
    const args = getAndValidateArgs()
    const workingDir = path.join(process.cwd(), args.directory)
    info(`working directory: ${workingDir}`)

    const projects = processProjects(workingDir, args.projects)

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

    const resultsPr: CompilerOutput[] = []
    for (const project of projects) {
      const compiled = await compileProject({ 
        branch: 'current',
        debug: args.debug,
        workingDir,
      }, project)
      resultsPr.push(compiled)
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

    const resultsBaseBranch: CompilerOutput[] = []
    for (const project of projects) {
      const compiled = await compileProject({ 
        branch: 'base',
        debug: args.debug,
        workingDir,
      }, project)
      resultsBaseBranch.push(compiled)
    }
    endGroup()

    startGroup(`Comparing errors`)

    const finalResults: ProjectResult[] = []
    for(let i = 0 ; i < projects.length; i++) {
      const project = projects[i]
      const errorsBefore = resultsPr[i].errors
      const errorsAfter = resultsBaseBranch[i].errors
      const res = buildProjectResult({
        ...args,
        project,
        errorsBefore,
        errorsAfter,
      })
      finalResults.push(res)
    }
    endGroup()

    startGroup(`Creating comment`)

    const commentInfo = {
      ...context.repo,
      issue_number: context.payload.pull_request!.number
    }

    const comment = {
      ...commentInfo,
      body: getBodyComment(finalResults)
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
        const err = errCreateComment as Error
        info(`Error creating PR review ${err.message}`)
      }
    }

    info(`comment created`)

    endGroup()

    const { shouldFailCheck, title, summary } = determineFailure(
      args.checkFailMode,
      aggregateResults(finalResults),
    )    

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
    const err = errorRun as Error
    setFailed(err.message)
  }
}

run()
