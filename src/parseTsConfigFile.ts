import * as fs from 'fs'

export function parseTsConfigFile(configPath: string): object {
    const content = fs.readFileSync(configPath).toString()
    return JSON.parse(content) as object
}
