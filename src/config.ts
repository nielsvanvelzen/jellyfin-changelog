import { yaml } from './deps.ts';

export enum GroupConfigType {
	Section,
	Dependencies,
	Leftover,
}

function groupConfigTypeFrom(name: string): GroupConfigType | null {
	if (name === 'section') return GroupConfigType.Section;
	else if (name === 'dependencies') return GroupConfigType.Dependencies;
	else if (name === 'leftover') return GroupConfigType.Leftover;
	else return null;
}

export class GroupConfig {
	public type: GroupConfigType = GroupConfigType.Section;
	public labels: string[] = [];
	public authors: string[] = [];

	static from(object: Record<string, unknown>): GroupConfig {
		const config = new GroupConfig();

		if ('type' in object && typeof object.type === 'string')
			config.type = groupConfigTypeFrom(object.type) || config.type;

		if ('labels' in object && Array.isArray(object.labels)) config.labels = object.labels;

		if ('authors' in object && Array.isArray(object.authors)) config.authors = object.authors;

		return config;
	}
}

export class Config {
	public githubToken: string = null!;
	public repository: string = null!;
	public milestone: string = null!;
	public addContributors = false;
	public addContributorCounts = false;
	public previousReleases: string[] = [];
	public groups: GroupConfig[] = [];

	static from(object: Record<string, unknown>): Config {
		const config = new Config();

		if ('githubToken' in object && typeof object.githubToken === 'string') config.githubToken = object.githubToken;
		else throw new Error('Missing githubToken in config');

		if ('repository' in object && typeof object.repository === 'string') config.repository = object.repository;
		else throw new Error('Missing repository in config');

		if ('milestone' in object && typeof object.milestone === 'string') config.milestone = object.milestone;
		else throw new Error('Missing milestone in config');

		if ('addContributors' in object && typeof object.addContributors === 'boolean')
			config.addContributors = object.addContributors;
		if ('addContributorCounts' in object && typeof object.addContributorCounts === 'boolean')
			config.addContributorCounts = object.addContributorCounts;

		if ('previousReleases' in object && Array.isArray(object.previousReleases))
			config.previousReleases = object.previousReleases;

		if ('groups' in object && Array.isArray(object.groups))
			config.groups = object.groups.map(group => GroupConfig.from(group));

		return config;
	}
}

export function parseConfig(content: string): Config {
	const object = yaml.parse(content);
	if (!object || typeof object !== 'object') throw new Error('Config is not an object');

	return Config.from(object as Record<string, unknown>);
}
