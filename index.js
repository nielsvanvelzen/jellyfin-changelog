const { Octokit } = require('@octokit/rest');
const { throttling } = require('@octokit/plugin-throttling');
const { writeFileSync } = require('fs');
const config = require('./config.json');

const octokit = new (Octokit.plugin(throttling))({
	auth: config.githubToken,
	throttle: {
		onRateLimit: (retryAfter, options) => {
			console.log(`Request quota exhausted for request ${options.method} ${options.url}. Retry after ${retryAfter} seconds.`);
			return true;
		},
		onAbuseLimit: (retryAfter, options) => console.log(`Abuse detected for request ${options.method} ${options.url}. Retry after ${retryAfter} seconds.`),
	},
});
async function getMergedPullRequests(repository, project) {
	console.log(`getMergedPullRequests ${repository}:${project}`);
	const prs = [];

	let page = 1;
	while (true) {
		console.log(`getMergedPullRequests ${repository}:${project} page ${page}`);
		const res = await octokit.search.issuesAndPullRequests({
			per_page: 100,
			page,
			q: `repo:${repository} is:pr project:${repository}/${project} sort:created-asc`,
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

async function getPreviousReleasePullRequests(repository, tag) {
	console.log(`getPreviousReleasePullRequests ${repository}:${tag}`);
	const [owner, repo] = repository.split('/');
	const res = await octokit.repos.getReleaseByTag({ owner, repo, tag });
	const matches = res.data.body.matchAll(/\s+#(\d{1,5}),/g);
	
	return [...matches].map(match => parseInt(match[1])).filter(n => !isNaN(n));
}

function getChangelogEntry(pr) {
	return `- ${pr.title.trim()} #${pr.number}, by @${pr.user.login}`;
}

async function getChangelog(prs, addContributors, addContributorCounts, groups) {
	console.log(`getChangelog prs=${prs.length} addContributors=${addContributors} addContributorCounts=${addContributorCounts}`);

	const excludeFromChangelog = new Set();
	const changelogGroups = [];
	const changelogSymbol = Symbol();
	for (const group of groups) {
		if (group.type === 'changelog') {
			changelogGroups.push(changelogSymbol);
			continue;
		}

		const groupPrs = prs.filter(pr => pr.labels.some(label => group.labels.includes(label.name)));
		if (groupPrs.length) {
			let changelogGroup = '';
			changelogGroup += `## ${group.name}\n\n`;
			changelogGroup += groupPrs.map(getChangelogEntry).join('\n');
			changelogGroup += '\n\n';
			changelogGroups.push(changelogGroup);
		}
		if (group.exclusive) {
			groupPrs.forEach(pr => excludeFromChangelog.add(pr));
		}
	}
	
	const leftOverPrs = prs.filter(pr => !excludeFromChangelog.has(pr));
	let leftOverChangelog = '';
	if (leftOverPrs.length) {
		leftOverChangelog += '## Changelog\n\n';
		leftOverChangelog += leftOverPrs.map(getChangelogEntry).join('\n');
		leftOverChangelog += '\n\n';
	}


	let changelog = '';
	if (changelogGroups.includes(changelogSymbol)) {
		changelog += changelogGroups.map(group => group === changelogSymbol ? leftOverChangelog : group).join('');
	} else {
		changelog += changelogGroups.join('') + leftOverChangelog;
	}

	if (addContributors) {
		changelog += '\n';
		changelog += '## Contributors\n\n';
		changelog += Object.entries(prs.reduce((map, it) => {
			if (it.user.login in map) map[it.user.login] += 1;
			else map[it.user.login] = 1;

			return map;
		}, {})).sort((a,b) => b[1] - a[1]).map(([username, amount]) => {
			return `- @${username}` + (addContributorCounts ? ` (${amount})` : '');
		}).join('\n');
		changelog += '\n';
	}

	return changelog;
}

async function getFilterPullRequests(repository, releaseTags) {
	console.log(`getFilterPullRequests ${repository}:${releaseTags.length} tags`);
	const filterIds = new Set();

	for (const tag of releaseTags) {
		for (const id of await getPreviousReleasePullRequests(repository, tag)) {
			filterIds.add(id);
		}
	}

	return Array.from(filterIds);
}

function filterPullRequests(pullRequests, filter) {
	console.log(`filterPullRequests prs=${pullRequests.length} filter=${filter.length}`);
	return pullRequests.filter(pr => !filter.includes(pr.number));
}

(async () => {
	const filter = await getFilterPullRequests(config.repository, config.previousReleases);
	const prs = await getMergedPullRequests(config.repository, config.project);
	const filteredPrs = filterPullRequests(prs, filter);
	const changelog = await getChangelog(filteredPrs, config.addContributors, config.addContributorCounts, config.groups || []);

	writeFileSync('pull_requests.json', JSON.stringify(prs, null, '\t'));
	console.log('Pull requests written to pull_requests.json');
	writeFileSync('changelog.md', changelog);
	console.log('Changelog written to changelog.md');
})();
