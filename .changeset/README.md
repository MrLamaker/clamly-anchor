# Changesets

Every change to a published package needs a changeset: run `pnpm changeset`, pick the packages and the kind of change, and
describe it for the people who use the package. Merging to `main` opens a release pull request that bumps versions and updates
changelogs; merging that pull request publishes to npm with provenance.
