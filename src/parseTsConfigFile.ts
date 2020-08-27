import * as fs from 'fs'
import * as ts from 'typescript'

interface Tsconfig {
    compilerOptions: ts.CompilerOptions
    include?: string[]
    exclude?: string[]
}
export function parseTsConfigFile(configPath: string): Tsconfig {
    const content = fs.readFileSync(configPath).toString()
    return JSON.parse(content) as Tsconfig
}
