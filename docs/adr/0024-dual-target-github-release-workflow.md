# Dual-Target GitHub Release Workflow

Packaging browser extensions manually creates release friction and inconsistent zip artifacts. We decided to implement an automated GitHub Actions release workflow (`.github/workflows/release.yml`) triggered by version tags (`v*`) or manual dispatch. The pipeline runs TypeScript verification, compiles and packages dual-browser zip distributions for Chrome MV3 and Firefox, and publishes automated GitHub Releases with generated changelogs.
