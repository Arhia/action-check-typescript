import * as ts from 'typescript'
import * as path from 'path'
import * as fs from 'fs'

export function parseTsConfigFileToCompilerOptions(configPath: string): ts.CompilerOptions {
    const content = fs.readFileSync(configPath).toString()
    let parsed: ts.ParsedCommandLine
    let compilerOptions: ts.CompilerOptions
    try {
        parsed = ts.parseJsonConfigFileContent(JSON.parse(content), ts.sys, path.dirname(configPath))
        compilerOptions = parsed.options
    } catch (error) {
        throw new Error(`Error while parsing tsconfig and converting to compiler options \n ${error.message}`)
    }
    return compilerOptions
}
