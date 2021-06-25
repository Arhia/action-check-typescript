import * as ts from "typescript"
import { ErrorTs } from "../main"

const defaultTscOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    noEmit: true,
    noImplicitAny: false,
    includes: ['**/*.ts', '**/*/d.ts'],
    exclude: [
        "**/*.spec.ts",
        "node_modules"
    ]
}

type Input = {
    /**  */
    rootPath: string
    /** paths à partir desquels lancer tsc, par exemple : ./server/server/ts */
    rootNames: ts.CreateProgramOptions['rootNames']
    projectReferences: ts.CreateProgramOptions['projectReferences']
    tscOptions?: ts.CompilerOptions
}

export function compileTsFiles({ rootNames, rootPath, tscOptions, projectReferences }: Input): ErrorTs[] {

    const program = ts.createProgram({
        rootNames,
        projectReferences,
        options: {
            ...defaultTscOptions,
            ...(tscOptions ?? {})
        }
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
                fileName: diagnostic.file.fileName.replace(`${rootPath}/`, ''),
                fileNameResolved: diagnostic.file.fileName,
                line: line + 1,
                column: character + 1,
                message: typeof diagnostic.messageText === 'string' ? diagnostic.messageText : diagnostic.messageText.messageText
            }
            const errAlreadyDetected = errors.find(err => {
                return err.fileName === errFormated.fileName
                    && err.code === errFormated.code
                    && err.line === errFormated.line
                    && err.column === errFormated.column
                    && err.message === errFormated.message
            })
            if (!errAlreadyDetected) {
                errors.push(errFormated)
            }
        } else {
            //console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
        }
    })

    return errors
}
