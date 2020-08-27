import * as ts from 'typescript'

export function compile(fileNames: string[], options: ts.CompilerOptions): void {
  const program = ts.createProgram(fileNames, options)
  const emitResult = program.emit()

  const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics)

  allDiagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
      let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!)
      let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
      console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`)
    } else {
      console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
    }
  })

  const exitCode = emitResult.emitSkipped ? 1 : 0
  console.log(`Process exiting with code '${exitCode}'.`)
  process.exit(exitCode)
}
