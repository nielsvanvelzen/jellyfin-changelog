import { parseConfig } from './config.ts';
import { GitHub } from './github.ts';

const config = parseConfig(await Deno.readTextFile('./config.yaml'));

const github = new GitHub(config.githubToken);

function getChangelogEntry(pr: any): string {
	return `- ${pr.title.trim()} #${pr.number}, by @${pr.user.login}`;
}

function getRenovateEntries(prs: any[]): string {
	let lines = '';

	let updates: Record<string, { version: string; pr: any }[]> = {};
	function writeUpdates() {
		for (const dependency of Object.keys(updates)) {
			const versions = updates[dependency];
			lines += `- Update ${dependency}\n`;
			for (const { version, pr } of versions) {
				lines += `  - ${version} #${pr.number}\n`;
			}
		}

		updates = {};
	}

	for (const pr of prs) {
		if (pr.user.login !== 'renovate[bot]') {
			writeUpdates();
			lines += `${getChangelogEntry(pr)}\n`;
			continue;
		}

		try {
			const [, dependency, version] = pr.title.match(/^Update (?:dependency |)(.*?)(?: digest|) to (.*?)$/);
			if (!(dependency in updates)) updates[dependency] = [];
			updates[dependency].push({ version, pr });
		} catch (err) {
			writeUpdates();
			lines += `${getChangelogEntry(pr)}\n`;
		}
	}

	writeUpdates();

	return lines;
}

function getChangelog(prs: any[], addContributors: boolean, addContributorCounts: boolean, groups: any[]) {
	console.log(
		`getChangelog prs=${prs.length} addContributors=${addContributors} addContributorCounts=${addContributorCounts}`
	);

	const excludeFromChangelog = new Set();
	const changelogGroups = [];
	const changelogSymbol = Symbol();
	let defaultGroup = null;
	for (const group of groups) {
		if (group.type === 'changelog') {
			defaultGroup = group;
			changelogGroups.push(changelogSymbol);
			continue;
		}

		const groupPrs = prs.filter(pr => pr.labels.some(label => group.labels.includes(label.name)));
		if (groupPrs.length) {
			let changelogGroup = '';
			changelogGroup += `\n## ${group.name}\n\n`;
			if (group.renovate) changelogGroup += getRenovateEntries(groupPrs);
			else changelogGroup += groupPrs.map(getChangelogEntry).join('\n');
			changelogGroup += '\n';
			changelogGroups.push(changelogGroup);
		}
		if (group.exclusive) {
			groupPrs.forEach(pr => excludeFromChangelog.add(pr));
		}
	}

	const leftOverPrs = prs.filter(pr => !excludeFromChangelog.has(pr));
	let leftOverChangelog = '';
	if (leftOverPrs.length) {
		leftOverChangelog += `\n## ${(defaultGroup ? defaultGroup.name : null) ?? 'Changelog'}\n\n`;
		leftOverChangelog += leftOverPrs.map(getChangelogEntry).join('\n');
		leftOverChangelog += '\n';
	}

	let changelog = ``;
	if (changelogGroups.includes(changelogSymbol)) {
		changelog += changelogGroups.map(group => (group === changelogSymbol ? leftOverChangelog : group)).join('');
	} else {
		changelog += changelogGroups.join('') + leftOverChangelog;
	}

	if (addContributors) {
		changelog += '## Contributors\n\n';
		changelog += Object.entries(
			prs.reduce((map, it) => {
				if (it.user.login in map) map[it.user.login] += 1;
				else map[it.user.login] = 1;

				return map;
			}, {})
		)
			.sort((a, b) => b[1] - a[1])
			.map(([username, amount]) => {
				return `- @${username}` + (addContributorCounts ? ` (${amount})` : '');
			})
			.join('\n');
		changelog += '\n';
	}

	return changelog.trimStart();
}

async function getFilterPullRequests(repository: string, releaseTags: string[]): Promise<number[]> {
	console.log(`getFilterPullRequests ${repository}:${releaseTags.length} tags`);
	const filterIds = new Set<number>();

	for (const tag of releaseTags) {
		for (const id of await github.getPreviousReleasePullRequests(repository, tag)) {
			filterIds.add(id);
		}
	}

	return Array.from(filterIds);
}

function filterPullRequests(pullRequests: any[], filter: number[]) {
	console.log(`filterPullRequests prs=${pullRequests.length} filter=${filter.length}`);
	return pullRequests.filter(pr => !filter.includes(pr.number));
}

const filter = await getFilterPullRequests(config.repository, config.previousReleases);
const prs = await github.getMergedPullRequests(config.repository, config.milestone);
const filteredPrs = filterPullRequests(prs, filter);
const changelog = getChangelog(filteredPrs, config.addContributors, config.addContributorCounts, config.groups || []);

await Deno.writeTextFile('pull_requests.json', JSON.stringify(prs, null, '\t'));
console.log('Pull requests written to pull_requests.json');
await Deno.writeTextFile('changelog.md', changelog);
console.log('Changelog written to changelog.md');
