export class MarkdownBuilder {
	private content = '';

	constructor() {}

	public append(...string: string[]): this {
		this.content += string.join('');

		return this;
	}

	public appendLine(...string: string[]): this {
		this.content += string.join('') + '\n';

		return this;
	}

	public appendHeading(name: string, depth: 1 | 2 | 3 | 4 | 5 | 6 = 2): this {
		this.appendLine('#'.repeat(depth), ' ', name);
		this.appendLine();

		return this;
	}

	public appendGitHubAuthorReference(author: string): this {
		this.append('@', escapeMarkdown(author));

		return this;
	}

	public appendGitHubPullRequestReference(id: number): this {
		this.append('#', id.toString());

		return this;
	}

	public appendPullRequest(title: string, author: string, id: number): this {
		// - $title #$id, by @$author
		this.append('- ', escapeMarkdown(title), ' ');
		this.appendGitHubPullRequestReference(id);
		this.append(', by ');
		this.appendGitHubAuthorReference(author);
		this.appendLine();

		return this;
	}

	public appendPullRequests(title: string, prefix: string, pullRequests: { title: string; author: string; id: number }[]): this {
		this.appendLine('- ', escapeMarkdown(title));
		for (const pr of pullRequests) {
			this.append('  ');
			const title = `${prefix}${pr.title}`;
			this.appendPullRequest(title, pr.author, pr.id);
		}

		return this;
	}

	public appendContributor(author: string, count?: number) {
		this.append('- ');
		this.appendGitHubAuthorReference(author);
		if (count !== undefined) this.append(' ', '(', count.toString(), ')');
		this.appendLine();
	}

	public toString(): string {
		this.content = this.content.replace(/\n\n$/, '\n');
		return this.content;
	}
}

export function escapeMarkdown(input: string): string {
	return input.replace(/([\\`*_{}\[\]<>()#+-\.!\|@])/g, '\\$1');
}
