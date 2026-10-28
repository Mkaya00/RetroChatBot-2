# Contributing

Thanks for helping improve RetroChat.

1. Follow the setup instructions in the README and work on a descriptive branch.
2. Keep the frontend in plain HTML, CSS, and JavaScript.
3. Write code comments, interface text, documentation, and pull requests in English.
4. Keep both eras usable and preserve the distinction between history and speculation.
5. Add meaningful tests for API behavior changes. Mock Gemini in tests.
6. Run the checks below before opening a pull request.

```powershell
.\.venv\Scripts\python -m unittest -v
node --check static/app.js
```

Node.js is optional for running the app; the second command only checks JavaScript syntax.
On macOS / Linux, use `.venv/bin/python` instead of the Windows Python path.

Stage the files you intend to publish, then check for accidental secrets:

```powershell
.\.venv\Scripts\python scripts/check_repository.py
git diff --cached --stat
```

Never include `.env`, API keys, virtual environments, private conversations, or logs.
Use short, synthetic conversations for screenshots. Do not put secrets in issues
or pull requests. If you exposed a credential, revoke it before reporting the issue.

For UI changes, check both 1999 and 2030, small-screen layouts, keyboard access,
and reduced-motion behavior. Include screenshots where they clarify the change.
