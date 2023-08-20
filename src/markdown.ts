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

	public appendPullRequests(title: string, author:string, versions: { title: string; id: number }[]): this {
		this.append('- ', escapeMarkdown(title));
		this.append(' by ');
		this.appendGitHubAuthorReference(author);

		versions.forEach((pr, index) => {
			if (index !== 0) this.append(', ');
			else this.append(' ');

			this.append(escapeMarkdown(pr.title));
			this.append(' ');
			this.appendGitHubPullRequestReference(pr.id);
		});
		this.appendLine();

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
