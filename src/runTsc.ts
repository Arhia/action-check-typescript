import { exec, ExecOptions } from '@actions/exec'
import * as path from 'path'
import { setFailed } from '@actions/core'

interface Cfg {
  workingDir: string
  tsconfigPath?: string
  files?: string[]
}
export async function runTsc({ workingDir, tsconfigPath, files }: Cfg): Promise<{ output: string, error: string }> {

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
  ]
  if (tsconfigPath) {
    execArgs.push('--project', tsconfigPath)
  }
  // si on passe un tableau de filenames, on les sépare par un espace pour les passer au compiler
  if (files) {
    execArgs.push(files.reduce((str, file) => {
      return `${str} ${file}`
    }, ''))
  }

  try {
    await exec('node', execArgs)
  } catch (error) {
    setFailed('')
  }

  return {
    output: myOutput,
    error: myError
  }

}