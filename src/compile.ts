import * as ts from 'typescript'
import { info } from '@actions/core'

export function compile(fileNames: string[], options: ts.CompilerOptions): void {
  const program = ts.createProgram(fileNames, options)
  const emitResult = program.emit()

  const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics)

  for (const diagnostic of allDiagnostics) {

    if (diagnostic.file) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!)
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
      info(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`)
    } else {
      info(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
    }

  }

  const exitCode = emitResult.emitSkipped ? 1 : 0
  info(`Process tsc exiting with code '${exitCode}'.`)
  process.exit(exitCode)
}
