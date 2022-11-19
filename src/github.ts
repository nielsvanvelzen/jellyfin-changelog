import { Octokit, PullRequest, throttling } from './deps.ts';

export class GitHub {
	private octokit: Octokit;

	constructor(token: string) {
		const OctokitConstructor = Octokit.plugin(throttling);

		this.octokit = new OctokitConstructor({
			auth: token,
			throttle: {
				onRateLimit: (retryAfter: number, options: { method: string; url: string }) => {
					console.log(
						`Request quota exhausted for request ${options.method} ${options.url}. Retry after ${retryAfter} seconds.`
					);
					return true;
				},
				onAbuseLimit: (retryAfter: number, options: { method: string; url: string }) =>
					console.log(
						`Abuse detected for request ${options.method} ${options.url}. Retry after ${retryAfter} seconds.`
					),
			},
		});
	}

	async getMergedPullRequests(repository: string, milestone: string): Promise<PullRequest[]> {
		console.log(`getMergedPullRequests ${repository}:${milestone}`);
		const prs = [];

		let page = 1;
		while (true) {
			console.log(`getMergedPullRequests ${repository}:${milestone} page ${page}`);
			const res = await this.octokit.search.issuesAndPullRequests({
				per_page: 100,
				page,
				q: `repo:${repository} is:pr milestone:${milestone} sort:created-asc`,
			});
			if (res.data.items.length == 0) break;

			for (const item of res.data.items) {
				if (item.pull_request && item.pull_request.merged_at !== null) prs.push(item);
				else console.warn(`skipping pull request ${item.id}: not merged`);
			}

			page++;
		}

		return prs;
	}

	async getTagReleaseNotes(repository: string, tag: string): Promise<string> {
		console.log(`getPreviousReleasePullRequests ${repository}:${tag}`);
		const [owner, repo] = repository.split('/');
		const res = await this.octokit.repos.getReleaseByTag({ owner, repo, tag });
		return res.data.body || '';
	}
}
