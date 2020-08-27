import { info, startGroup, endGroup, setFailed } from '@actions/core'
import * as path from 'path'
// import { context, getOctokit } from '@actions/github'
// import { createCheck } from './createCheck'
import * as github from '@actions/github'
import { GitHub } from '@actions/github/lib/utils'
import { compile } from './compile'
import * as fs from 'fs'
import { parseTsConfigFileToCompilerOptions } from './parseTsConfigFileToCompilerOptions'
import { getAndValidateArgs } from './getAndValidateArgs'
import { parseTsConfigFile } from './parseTsConfigFile'
import { getFilesToCompile } from './getFilesToCompile'
import { exec } from '@actions/exec'

type GithubClient = InstanceType<typeof GitHub>

async function run(): Promise<void> {
  try {
    const args = getAndValidateArgs()
    info('Starting GitHub Client')
    const workingDir = path.join(process.cwd(), args.directory)

    const tsconfigPath = path.join(workingDir, args.configPath)
    if (!fs.existsSync(tsconfigPath)) {
      throw new Error(`could not find tsconfig.json at: ${tsconfigPath}`)
    }

    info('Starting GitHub Client')
    //const client = github.getOctokit(args.repoToken)

    const pr = github.context.payload.pull_request

    // changed files
    //const files = pr!.repository.pullRequest.files.nodes

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

    startGroup(`[current] Install Dependencies`)
    info(`Installing using ${installScript}`)
    await exec(installScript, [], execOptions)
    endGroup()

    const compilerOptions = parseTsConfigFileToCompilerOptions(tsconfigPath)
    info(`compilerOptions ${JSON.stringify(compilerOptions)}`)

    const config = parseTsConfigFile(tsconfigPath)
    info(`config ${JSON.stringify(config)}`)

    const fileNames: string[] = getFilesToCompile({
      workingDir,
      rootDir: config.compilerOptions.rootDir,
      include: config.include,
      exclude: config.exclude
    })
    info(`files to compile : \n${fileNames.map(one => `${one}\n`)}`)

    compile(fileNames, compilerOptions)
  } catch (errorRun) {
    setFailed(errorRun.message)
  }
}

run()
