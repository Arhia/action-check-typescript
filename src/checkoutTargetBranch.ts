import { startGroup, endGroup, debug } from '@actions/core'
import { exec } from '@actions/exec'
import { Context } from '@actions/github/lib/context'

export async function checkoutTargetBranch(context: Context, pr: Context['payload']['pull_request']): Promise<void> {

    startGroup(`[base] Checkout target branch`)
    let baseRef
    try {
        baseRef = context.payload.base.ref
        if (!baseRef) throw Error('missing context.payload.pull_request.base.ref')
        await exec(`git fetch -n origin ${context.payload.pull_request!.base.ref}`)
        debug('successfully fetched base.ref')
    } catch (errFetchBaseRef) {
        debug(`fetching base.ref failed ${errFetchBaseRef.message}`)
        try {
            await exec(`git fetch -n origin ${pr!.base.sha}`)
            debug('successfully fetched base.sha')
        } catch (errFetchBaseSha) {
            debug(`fetching base.sha failed ${errFetchBaseSha.message}`)
            try {
                await exec(`git fetch -n`)
            } catch (errFetch) {
                debug(`fetch failed ${errFetch.message}`)
            }
        }
    }

    debug('checking out and building base commit')
    try {
        if (!baseRef) throw Error('missing context.payload.base.ref')
        await exec(`git reset --hard ${baseRef}`)
    } catch (e) {
        await exec(`git reset --hard ${pr!.base.sha}`)
    }
    endGroup()

}