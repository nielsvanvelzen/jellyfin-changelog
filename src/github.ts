import { Octokit } from '@octokit/rest';
import type { RestEndpointMethodTypes } from '@octokit/rest';
import { throttling } from '@octokit/plugin-throttling';

export type PullRequest = RestEndpointMethodTypes['search']['issuesAndPullRequests']['response']['data']['items'][number];

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
				onSecondaryRateLimit: (retryAfter: number, options: { method: string; url: string }) =>
					console.log(
						`Secondary quota detected for request ${options.method} ${options.url}. Retry after ${retryAfter} seconds.`
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
				q: `repo:${repository} AND is:pr AND milestone:${milestone}`,
				sort: 'created',
				order: 'asc',
				advanced_search: 'true',
			});
			if (res.data.items.length == 0) break;

			for (const item of res.data.items) {
				if (!item.pull_request) continue;
				if (item.pull_request.merged_at !== null) prs.push(item);
				else console.warn(`skipping pull request ${item.number}: not merged`);
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
