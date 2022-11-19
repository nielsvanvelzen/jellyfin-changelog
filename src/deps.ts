import type { RestEndpointMethodTypes } from 'npm:@octokit/rest';
export { Octokit } from 'npm:@octokit/rest';
export { throttling } from 'npm:@octokit/plugin-throttling';
export type PullRequest = RestEndpointMethodTypes['search']['issuesAndPullRequests']['response']['data']['items'][number];


export * as yaml from 'https://deno.land/std@0.165.0/encoding/yaml.ts';
