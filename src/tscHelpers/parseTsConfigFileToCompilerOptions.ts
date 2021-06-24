import * as ts from 'typescript'
import * as path from 'path'
import * as fs from 'fs'

type ResultParsingTsConfig = {
    compilerOptions: ts.CompilerOptions,
    rawParsing: ts.CompilerOptions & { exclude?: string[], include?: [] }
}
export function parseTsConfigFileToCompilerOptions(configPath: string): ResultParsingTsConfig {
    const content = fs.readFileSync(configPath).toString()
    const rawParsing = JSON.parse(content)
    let parsed: ts.ParsedCommandLine
    let compilerOptions: ts.CompilerOptions
    try {
        parsed = ts.parseJsonConfigFileContent(rawParsing, ts.sys, path.dirname(configPath))
        compilerOptions = parsed.options
    } catch (error) {
        throw new Error(`Error while parsing tsconfig and converting to compiler options \n ${error.message}`)
    }
    return {
        compilerOptions,
        rawParsing
    }
}
