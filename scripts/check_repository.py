"""Check Git's index for private files and exposed keys without printing secrets.

This basic check does not scan Git history or replace a dedicated secret scanner.
"""
from pathlib import Path
import re
import subprocess
import sys

from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parent.parent


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def main():
    paths = [p for p in git('ls-files', '--cached', '-z').decode('utf-8').split('\0') if p]
    if not paths:
        print('No files to check. Stage the intended public files first.')
        return 1
    local_key = dotenv_values(ROOT / '.env').get('GEMINI_API_KEY') or ''
    issues = []
    key_pattern = re.compile(rb'AIza[0-9A-Za-z_-]{35}')
    for name in paths:
        path = Path(name)
        if ((path.name == '.env' or path.name.startswith('.env.')) and path.name != '.env.example') or \
           any(part in ('.venv', 'venv', '__pycache__') for part in path.parts) or \
           path.suffix.lower() in ('.pem', '.key', '.p12'):
            issues.append(f'{name}: private or generated file in index')
            continue
        data = git('show', ':' + name)
        if key_pattern.search(data) or (len(local_key) >= 12 and local_key.encode() in data):
            issues.append(f'{name}: possible API key found (value hidden)')
        if name == '.env.example' and re.search(rb'(?m)^GEMINI_API_KEY=[ \t]*[^\s#\r\n]', data):
            issues.append(f'{name}: example API key must be empty')
    if issues:
        print('\n'.join(issues))
        return 1
    print(f'Checked {len(paths)} Git files: no private files or API keys found.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
