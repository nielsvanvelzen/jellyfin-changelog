import type { RestEndpointMethodTypes } from 'npm:@octokit/rest';
export { Octokit } from 'npm:@octokit/rest';
export { throttling } from 'npm:@octokit/plugin-throttling';
export type PullRequest = RestEndpointMethodTypes['search']['issuesAndPullRequests']['response']['data']['items'][number];

export * as yaml from 'https://deno.land/std@0.165.0/encoding/yaml.ts';
export * as path from 'https://deno.land/std@0.165.0/path/mod.ts';
export * as flags from 'https://deno.land/std@0.165.0/flags/mod.ts';
