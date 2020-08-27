import * as ts from 'typescript'
import * as path from 'path'
import * as fs from 'fs'

export function parseTsConfigFileToCompilerOptions(configPath: string): ts.CompilerOptions {
    const content = fs.readFileSync(configPath).toString()
    const parsed = ts.parseJsonConfigFileContent(JSON.parse(content), ts.sys, path.dirname(configPath))
    const compilerOptions = parsed.options
    return compilerOptions
}
