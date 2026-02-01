# Update CHANGELOG.md

## Overview

Analyze the git log (@git) for all commits since the last release tag and perform the following updates:

## Steps

1. **Version Determination**:
   - Evaluate the commits to determine the next version number (SemVer).
   - If there are breaking changes, increment the **Major**.
   - If there are new features, increment the **Minor**.
   - If there are only fixes/maintenance, increment the **Patch**.

2. **Update package.json**:
   - Update the `"version"` field in `@package.json` (or equivalant files depending on the techstack) to the new version number.

3. **Update CHANGELOG.md**:
   - Prepend a new version section following "Keep a Changelog" (v1.1.0).
   - Use the new version number and today's date (2026-02-01).
   - Categorize changes into: **Added**, **Changed**, **Fixed**, **Security**, **Deprecated**, and **Removed**.
   - Synthesize multiple related commits into short succinct bullet points.

4. **Review**:
   - Ensure the version in `package.json` and `CHANGELOG.md` match exactly.

## Response Checklist
- [ ] Updated CHANGELOG.md
- [ ] Updated the `"version"` field in `@package.json` or equivalant files
- [ ] Verified new version and date are accurate
- [ ] Verified format in new version section is consistent with the rest
