import * as ts from "typescript"

const defaultTscOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    noEmitOnError: true,
    noImplicitAny: false,
    exclude: [
        "server/test/test-typescript/**/*.ts",
        "**/*.spec.ts",
        "node_modules/"
    ]
}

export type ErrorTs = {
    fileName: string
    fileNameResolved: string
    code: number
    message: string
    line: number
    character: number
}

type Input = {
    /**  */
    rootPath: string
    /** paths à partir desquels lancer tsc, par exemple : ./server/server/ts */
    rootNames: string[]
    tsOptions?: ts.CompilerOptions
}

export function compileTsFiles({ rootNames, rootPath, tsOptions }: Input): ErrorTs[] {

    const program = ts.createProgram(rootNames, {
        ...defaultTscOptions,
        ...(tsOptions ?? {})
    })

    const emitResult = program.emit()

    const allDiagnostics = ts
        .getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics)

    const errors: ErrorTs[] = []

    allDiagnostics.forEach(diagnostic => {
        if (diagnostic.file) {
            const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!)
            const errFormated = {
                code: diagnostic.code,
                fileName: diagnostic.file.fileName.replace(rootPath, '.'),
                fileNameResolved: diagnostic.file.fileName,
                line: line + 1,
                character: character + 1,
                message: typeof diagnostic.messageText === 'string' ? diagnostic.messageText : diagnostic.messageText.messageText
            }
            const errAlreadyDetected = errors.find(err => {
                return err.fileName === errFormated.fileName
                    && err.code === errFormated.code
                    && err.line === errFormated.line
                    && err.character === errFormated.character
                    && err.message === errFormated.message
            })
            if (!errAlreadyDetected) {
                errors.push(errFormated)
            }
        } else {
            console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
        }
    })

    return errors
}
