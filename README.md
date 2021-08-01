# jellyfin-changelog

A quick and dirty Node.js script to generate Jellyfin style changelogs.

## Usage

1. Install Node.js
2. `npm install`
3. Change config.json (see "Configuration")
4. `npm run build`

## Configuration

Copy `config.sample.json` to `config.json` and modify the various settings:

### githubToken

GitHub authentication token. Can be created at https://github.com/settings/tokens. Token does not need any scopes.

### repository

The GitHub owner+repository in the format `owner:repository`. Like `jellyfin/jellyfin-androidtv`.

### project

The GitHub project id to read pull requests from. This is appended to the url when opening the project.

### previousReleases

An array of tags to read descriptions from to filter out changelog entries. Normally used between beta releases to only list new changes.

### addContributors

Adds the contributors for the changelog items in order of most pull requests to least. Set to false to disable.

### addContributorCounts

Add the amount of contributions to each contributor. Set to false to disable.