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

### milestone

The GitHub milestone name to read pull requests from.

### previousReleases

An array of tags to read descriptions from to filter out changelog entries. Normally used between beta releases to only list new changes.

## groups

Array of changelog groups. Either `{ "type": "changelog" }` for all "left over" pull requests or an object with the following properties:

### name

The name of the group.

### labels

String array with the labels a pull request must have any of.

### exclusive

When set to true the pull requests in this list will never be added to the left over group.

### addContributors

Adds the contributors for the changelog items in order of most pull requests to least. Set to false to disable.

### addContributorCounts

Add the amount of contributions to each contributor. Set to false to disable.
