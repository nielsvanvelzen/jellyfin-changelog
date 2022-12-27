# jellyfin-changelog

A quick and dirty Deno script to generate GitHub changelogs.

## Configuration

Create a file to store your config in the config folder. You can copy the `.sample.yaml` file to get started. It's recommended to create a single config per project. You can extend different config files with the `.extend` property, like so:
> `.extend: ./_shared.yaml`
Use this to keep general config like your GitHub token in a separate file.

## Running

Execute the `run` task and provide the path to the config with the `-c` option.
> `deno task run -c .\config\coolproject.yaml`
