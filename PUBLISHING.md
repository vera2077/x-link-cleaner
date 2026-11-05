# Publishing to GitHub

The repository is initialised and committed locally. Three things need your
account, so they can't be done from here: creating the remote, pushing, and
enabling Pages.

## Before you push: replace the placeholders

`USERNAME` appears in the site and README and must become your GitHub username.

```powershell
cd x-link-cleaner-repo

# Set your GitHub username once
$user = "your-github-username"

# Replace every placeholder occurrence
(Get-ChildItem -Recurse -File -Include *.html,*.md |
  Where-Object { $_.FullName -notmatch '\\\.git\\' }) | ForEach-Object {
    (Get-Content $_.FullName -Raw).Replace('USERNAME', $user) |
      Set-Content $_.FullName -NoNewline -Encoding utf8
}

git add -A
git commit -m "Point links at the real repository"
```

That updates:

- `docs/index.html` — the nav "Source" link and the footer profile link
- `README.md` — the project-page link and the Firefox install link
- `docs/demo.js` — nothing (no placeholders there)

Also worth filling in before you publish:

- `README.md` — the "Firefox" install section links to `#`; paste the real
  addons.mozilla.org URL
- `README.md` — the userscript section links to `#`; paste the Greasy Fork URL

## Create the repository and push

Using the GitHub website:

1. Go to <https://github.com/new>
2. Name it `x-link-cleaner`
3. **Public**, and do **not** add a README, .gitignore, or license (they already exist)
4. Create it, then run the two commands GitHub shows you, which will look like:

```powershell
git remote add origin https://github.com/USERNAME/x-link-cleaner.git
git push -u origin main
```

## Turn on GitHub Pages

1. Open the repo → **Settings** → **Pages**
2. Under **Build and deployment**, set **Source** to `Deploy from a branch`
3. Branch: `main`, folder: `/docs`
4. Save

The site appears at `https://USERNAME.github.io/x-link-cleaner/` after a minute
or two. The first deploy often takes longer; watch the **Actions** tab.

`docs/.nojekyll` is already committed and does not need Jekyll config.

## After the site is live

Add the URL to the repository's **About** panel (top right of the repo page →
gear icon → *Website*), and add topics like `browser-extension`,
`twitter`, `privacy`.

## Cutting a new release

1. Bump `version` in `extension/manifest.json` and `@version` in
   `dist/x-link-cleaner.user.js`
2. Rebuild the zip:

```powershell
python scripts/build.py
```

That writes `dist/twitter-x-link-cleaner-v<version>.zip` with forward-slash paths
and verifies the result. (PowerShell's `Compress-Archive` writes backslashes,
which addons.mozilla.org rejects with "Invalid file name in archive".)

3. Commit, then tag it:

```powershell
git tag -a v3.1 -m "v3.1"
git push origin main --tags
```

4. On GitHub, **Releases** → **Draft a new release** → pick the tag → attach the
   zip → publish. Attaching the zip to the release means the download link in the
   README can be a stable release URL instead of a raw file path.

## Checking the package before uploading anywhere

`npx web-ext lint --source-dir extension` reports what addons.mozilla.org will.
It currently reports zero errors and zero warnings.
