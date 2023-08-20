import { MarkdownBuilder } from './markdown.ts';
import { GroupConfig, GroupConfigDisplay, GroupConfigType, readConfig } from './config.ts';
import { flags, PullRequest } from './deps.ts';
import { GitHub } from './github.ts';

async function getPreviousReleasePullRequests(repository: string, previousRelease: string) {
	const releaseNotes = await github.getTagReleaseNotes(repository, previousRelease);
	const matches = releaseNotes.matchAll(/\s+#(\d{1,5})(?:,|$)/gm);

	return [...matches].map(match => parseInt(match[1])).filter(n => !isNaN(n));
}

async function getPreviousReleasesPullRequests(repository: string, previousReleases: string[]): Promise<number[]> {
	console.log(`getPreviousReleasesPullRequests ${repository}:${previousReleases.length} releases`);
	const filterIds = new Set<number>();

	for (const previousRelease of previousReleases) {
		const pullRequests = await getPreviousReleasePullRequests(repository, previousRelease);
		for (const id of pullRequests) filterIds.add(id);
	}

	return Array.from(filterIds);
}

async function findPullRequests(
	repository: string,
	milestone: string,
	previousReleases: string[],
	ignoreLabels: string[]
) {
	const milestonePullRequests = await github.getMergedPullRequests(repository, milestone);
	const previousReleasesPullRequests = await getPreviousReleasesPullRequests(repository, previousReleases);

	return milestonePullRequests
		.filter(pr => !previousReleasesPullRequests.includes(pr.number))
		.filter(pr => !pr.labels.some(label => ignoreLabels.includes(label.name!)));
}

function getChangelogSections(
	pullRequests: PullRequest[],
	groups: GroupConfig[]
): { config: GroupConfig; pullRequests: PullRequest[] }[] {
	const sections: { config: GroupConfig; pullRequests: PullRequest[] }[] = groups.map(group => ({
		config: group,
		pullRequests: [],
	}));

	const leftOver = new Set(pullRequests);

	for (const section of sections) {
		if (section.config.type === GroupConfigType.Leftover) continue;

		for (const pr of leftOver) {
			// Filter author
			if (section.config.authors.length && !section.config.authors.includes(pr.user!.login)) continue;
			// Filter labels
			if (section.config.labels.length) {
				let found = false;
				for (const label of pr.labels) {
					if (section.config.labels.includes(label.name!)) {
						found = true;
						break;
					}
				}
				if (!found) continue;
			}

			section.pullRequests.push(pr);
			leftOver.delete(pr);
		}
	}

	for (const section of sections) {
		if (section.config.type !== GroupConfigType.Leftover) continue;
		section.pullRequests.push(...leftOver);
	}

	return sections;
}

function getChangelogContributors(pullRequests: PullRequest[]): { author: string; count: number }[] {
	const contributorMap = new Map<string, number>();

	for (const pr of pullRequests) {
		const user = pr.user!.login;
		if (!contributorMap.has(user)) contributorMap.set(user, 1);
		else contributorMap.set(user, contributorMap.get(user)! + 1);
	}

	const contributors = [...contributorMap.entries()]
		.map(([author, count]) => ({ author, count }))
		.sort((a, b) => b.count - a.count);

	return contributors;
}

function createChangelog(
	pullRequests: PullRequest[],
	title: string,
	prefix: string,
	suffix: string,
	groups: GroupConfig[],
	addContributors: boolean,
	addContributorCounts: boolean
): string {
	const sections = getChangelogSections(pullRequests, groups);
	const contributors = getChangelogContributors(pullRequests);

	// Create markdown
	const md = new MarkdownBuilder();
	if (title) md.appendHeading(title, 1);

	if (prefix.length) md.appendLine(prefix);

	for (const section of sections) {
		// Skip empty groups
		if (!section.pullRequests.length) continue;

		md.appendHeading(section.config.name, 2);

		if (section.config.type === GroupConfigType.Dependencies) {
			const dependencies: Record<
				string,
				{ dependency: string; author: string; versions: { version: string; pullRequest: PullRequest }[] }
			> = {};
			const leftOver: PullRequest[] = [];

			for (const pr of section.pullRequests) {
				const match = pr.title.match(/^Update (?:dependency |)(.*?)(?: digest|) to (.*?)$/);

				if (match) {
					const [, dependency, version] = match;
					const key = pr.user!.login + dependency;
					if (!(key in dependencies))
						dependencies[key] = { dependency, author: pr.user!.login, versions: [] };
					dependencies[key].versions.push({ version, pullRequest: pr });
				} else {
					leftOver.push(pr);
				}
			}

			for (const { dependency, author, versions } of Object.values(dependencies)) {
				if (versions.length === 1 || section.config.display === GroupConfigDisplay.Newest) {
					const pr = versions[versions.length - 1].pullRequest;
					md.appendPullRequest(pr.title, pr.user!.login, pr.number);
				} else {
					// Sort from newest to oldest
					versions.sort((a, b) => new Date(b.pullRequest.closed_at!).getTime() - new Date(a.pullRequest.closed_at!).getTime());

					md.appendPullRequests(
						`Update ${dependency}`,
						author,
						versions.map(({ version, pullRequest }) => ({
							title: version,
							id: pullRequest.number,
						}))
					);
				}
			}

			for (const pr of leftOver) {
				md.appendPullRequest(pr.title, pr.user!.login, pr.number);
			}
		} else {
			for (const pr of section.pullRequests) {
				md.appendPullRequest(pr.title, pr.user!.login, pr.number);
			}
		}

		md.appendLine();
	}

	if (addContributors && contributors.length) {
		md.appendHeading('Contributors', 2);
		for (const { author, count } of contributors) {
			md.appendContributor(author, addContributorCounts ? count : undefined);
		}
		md.appendLine();
	}

	if (suffix.length) md.append(suffix);

	return md.toString();
}

const options = flags.parse(Deno.args, {
	string: ['config'],
	alias: {
		c: 'config',
	},
});

const config = await readConfig(options.config!);
const github = new GitHub(config.githubToken);
const pullRequests = await findPullRequests(
	config.repository,
	config.milestone,
	config.previousReleases,
	config.ignoreLabels
);
const changelog = createChangelog(
	pullRequests,
	config.title,
	config.prefix,
	config.suffix,
	config.groups,
	config.addContributors,
	config.addContributorCounts
);

await Deno.writeTextFile('changelog.md', changelog);
console.log('Changelog written to changelog.md');
