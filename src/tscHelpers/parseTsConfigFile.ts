/* eslint no-unused-vars:"off" */

import * as fs from 'fs'
import * as ts from 'typescript'

interface TsConfig {
    compilerOptions: ts.CompilerOptions
    include?: string[]
    exclude?: string[]
}
export function parseTsConfigFile(configPath: string): TsConfig {
    const content = fs.readFileSync(configPath).toString()
    let config: TsConfig
    try {
        config = JSON.parse(content) as TsConfig
    } catch (error) {
        throw new Error(`Error while parsing tsconfig file as json
        \n
        Content of file :\n
        ${content}
        Error\n
        ${(error as Error).message}`
        )
    }
    return config
}
