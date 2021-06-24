import * as globby from 'globby'
import * as path from 'path'
import { info } from '@actions/core'
interface Options {
    workingDir: string
    rootDir?: string
    include?: string[]
    exclude?: string[]
}
export function getFilesToCompile({ workingDir, rootDir, include, exclude }: Options): string[] {

    const positivePatterns = rootDir ? [path.join(workingDir, rootDir)] : include!.map(one => {
        return path.join(workingDir, one)
    })

    const negatePatterns = exclude ? exclude.map(one => path.join(`!${workingDir}`, one)) : []

    const patterns = positivePatterns.concat(negatePatterns)
    info(`getFilesToCompile : patterns applied ${JSON.stringify(patterns)}`)
    return globby.sync(patterns)

}