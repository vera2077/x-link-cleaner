# Publishing to GitHub

You have never pushed a repository before, so this walks through it from the
start. Nothing here needs the GitHub CLI, and no code changes are pending — the
repository is already committed and ready.

There are two ways to do this. **Option A** (GitHub Desktop) is the easiest if you
would rather not touch a terminal. **Option B** uses the command line. Pick one.

---

## First: what "push" means

A git repository on your computer holds commits — snapshots of your files. Right
now those commits exist only on your machine. Creating a repository on GitHub
makes an empty one on their servers, and "pushing" copies your commits up to it.

You do this once. After that, pushing again just sends whatever changed.

---

## Option A — GitHub Desktop (recommended)

1. Install [GitHub Desktop](https://desktop.github.com/) and sign in with your
   GitHub account (`vera2077`).
2. Menu: **File → Add local repository…**
3. Choose the folder `C:\Users\melodi\Desktop\x-link-cleaner-repo`
4. You should see the three existing commits under **History**.
5. Click **Publish repository** at the top.
6. Name it `x-link-cleaner`, keep **Keep this code private** *unchecked* (Pages
   needs a public repo on a free account), and click **Publish repository**.

That's it — the code is on GitHub.

Then enable the website:

7. In GitHub Desktop: **Repository → View on GitHub**
8. On the GitHub page: **Settings** → **Pages**
9. Under *Build and deployment*, set **Source** to `Deploy from a branch`
10. Branch: **main**, folder: **/docs**, then **Save**
11. Wait 1–3 minutes, then open <https://vera2077.github.io/x-link-cleaner/>

---

## Option B — Command line

Open PowerShell and run these one at a time.

**1. Go to the repository folder**

```powershell
cd "C:\Users\melodi\Desktop\x-link-cleaner-repo"
```

**2. Check it looks right**

```powershell
git log --oneline
```

You should see three commits, newest first. If you see
`fatal: not a git repository`, you are in the wrong folder — check the path.

**3. Create the empty repository on GitHub**

Open <https://github.com/new> in your browser and fill in:

- **Repository name:** `x-link-cleaner`
- **Description:** optional, e.g. *Strips tracking parameters from X/Twitter links*
- **Visibility:** Public
- Leave **Add a README file** unchecked
- Leave **Add .gitignore** set to *None*
- Leave **Choose a license** set to *None*

Click **Create repository**.

> Those "leave unchecked" steps matter. If GitHub creates its own README or
> license, your first push is rejected for having unrelated histories. If that
> already happened, delete the repository on GitHub and create it again empty.

**4. Connect your local repo to it**

On the page GitHub shows you after creating the repo, find the section
**…or push an existing repository from the command line**. Run its first line, which is:

```powershell
git remote add origin https://github.com/vera2077/x-link-cleaner.git
```

**5. Push**

```powershell
git push -u origin main
```

A browser window will open asking you to sign in to GitHub. Approve it. (Git no
longer accepts your account password here — it uses a browser sign-in or a
personal access token. The browser prompt is the normal path on Windows.)

When it finishes, refresh the GitHub page. Your files are there.

**6. Turn on the website**

1. Repo page → **Settings** (top bar)
2. Left sidebar → **Pages**
3. *Source*: `Deploy from a branch`
4. *Branch*: `main`, folder: `/docs`
5. **Save**

Watch the **Actions** tab. When the deploy job goes green, the site is live at
<https://vera2077.github.io/x-link-cleaner/>.

---

## If something goes wrong

| Message | What it means | Fix |
|---|---|---|
| `remote origin already exists` | A remote is already set | `git remote set-url origin https://github.com/vera2077/x-link-cleaner.git` |
| `rejected ... fetch first` | GitHub's repo has commits yours doesn't (usually an auto-made README) | Delete the GitHub repo, recreate it empty, push again |
| `fatal: not a git repository` | Wrong folder | `cd` into `x-link-cleaner-repo` and retry |
| `Authentication failed` | Password used instead of browser sign-in | Re-run `git push -u origin main` and complete the browser prompt |
| 404 on the Pages URL | Deploy still running, or wrong folder | Check Actions tab; confirm folder is exactly `/docs` |

---

## After it works

- On the repo page, click the gear next to **About** and set **Website** to
  `https://vera2077.github.io/x-link-cleaner/`, then add topics such as
  `browser-extension`, `twitter`, `privacy`.
- The download button on the site points at
  `https://github.com/vera2077/x-link-cleaner/raw/main/dist/twitter-x-link-cleaner-v3.0.zip`,
  which works as soon as the repo is public.

## Making changes later

```powershell
cd "C:\Users\melodi\Desktop\x-link-cleaner-repo"
# ...edit files...
git add -A
git commit -m "Describe what changed"
git push
```

## Cutting a new release

1. Bump `version` in `extension/manifest.json` and `@version` in
   `dist/x-link-cleaner.user.js`
2. Rebuild the zip so paths use forward slashes (PowerShell's `Compress-Archive`
   writes backslashes, which addons.mozilla.org rejects):

```powershell
python scripts/build.py
```

3. Commit the new zip, then tag it and push the tag:

```powershell
git add -A
git commit -m "v3.1"
git tag -a v3.1 -m "v3.1"
git push
git push origin v3.1
```

4. On GitHub: **Releases** → **Draft a new release** → choose the tag, attach the
   zip from `dist/`, and publish.

## Checking the package before uploading to AMO

```powershell
npx web-ext lint --source-dir extension
```

It currently reports zero errors and zero warnings.
