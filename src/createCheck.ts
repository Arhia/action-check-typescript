import { getOctokit } from '@actions/github'
import { Context } from '@actions/github/lib/context'
type Octokit = ReturnType<typeof getOctokit>

interface DetailsCheck {
    conclusion:
    | 'success'
    | 'failure'
    | 'neutral'
    | 'cancelled'
    | 'skipped'
    | 'timed_out'
    | 'action_required'
    | undefined
    output: {
        title: string
        summary: string
    }
}

type CheckUpdater = (details: DetailsCheck) => Promise<void>

/*
 * create a check and return a function that updates(completes) it
 */
export async function createCheck(octokit: Octokit, context: Context, checkName: string): Promise<CheckUpdater> {
    const check = await octokit.checks.create({
        ...context.repo,
        name: checkName,
        head_sha: context.payload.pull_request!.head.sha,
        status: 'in_progress'
    })

    return async (details: DetailsCheck) => {
        await octokit.checks.update({
            ...context.repo,
            check_run_id: check.data.id,
            completed_at: new Date().toISOString(),
            status: 'completed',
            ...details
        })
    }
}
