import * as ts from 'typescript'
import { info } from '@actions/core'

export interface ErrorTs {
  fileName: string
  line: number
  column: number
  message: string
}

export interface ResultTsc {
  fileErrors: ErrorTs[]
  otherErrors: string[]
  exitCode: number
}

export function compile(fileNames: string[], compilerOptions: ts.CompilerOptions): ResultTsc {
  const program = ts.createProgram(fileNames, compilerOptions)
  const emitResult = program.emit()

  const fileErrors: ErrorTs[] = []
  const otherErrors: string[] = []

  const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics)

  for (const diagnostic of allDiagnostics) {

    if (diagnostic.file) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!)
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
      info(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`)
      fileErrors.push({
        fileName: diagnostic.file.fileName,
        line: line + 1,
        column: character + 1,
        message
      })
    } else {
      otherErrors.push(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
    }

  }

  const exitCode = emitResult.emitSkipped ? 1 : 0
  info(`Process tsc exiting with code '${exitCode}'.`)
  return {
    fileErrors,
    otherErrors,
    exitCode
  }
}
