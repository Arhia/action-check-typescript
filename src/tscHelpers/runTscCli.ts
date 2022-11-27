import { exec, ExecOptions } from '@actions/exec'
import * as path from 'path'
import { setFailed } from '@actions/core'

interface Cfg {
  workingDir: string
  tsconfigPath?: string
  files?: string[]
  extraArgs: string[]
}
/*
exemple d'output renvoyé

src/main.ts(39,11): error TS1155: 'const' declarations must be initialized.
src/main.ts(39,11): error TS7005: Variable 'hereIsAUnusedVariableToHaveAnError' implicitly has an 'any' type.
*/
export async function runTscCli({ workingDir, tsconfigPath, files, extraArgs }: Cfg): Promise<{ output: string, error: string }> {

  let myOutput = ''
  let myError = ''

  const options: ExecOptions = {}
  options.listeners = {
    stdout: (data: Buffer) => {
      myOutput += data.toString()
    },
    stderr: (data: Buffer) => {
      myError += data.toString()
    }
  }

  const execArgs = [
    `${path.join(workingDir, 'node_modules/typescript/bin/tsc')}`,
    '--noEmit',
    '--noErrorTruncation',
    '--pretty',
    'false',
    '--incremental',
    'false',
    '--watch',
    'false'
  ]
  if (tsconfigPath) {
    execArgs.push('--project', tsconfigPath)
  }

  if (extraArgs.length) {
    execArgs.push(...extraArgs)
  }
  // si on passe un tableau de filenames, on les sépare par un espace pour les passer au compiler
  if (files) {
    execArgs.push(files.reduce((str, file) => {
      return `${str} ${file}`
    }, ''))
  }

  try {
    await exec('node', execArgs, options)
  } catch (error) {
    setFailed((error as Error).message)
  }

  process.exitCode = 0

  return {
    output: myOutput,
    error: myError
  }

}