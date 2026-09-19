import os
import subprocess
import sys

def setup_git_hooks():
    print("[INFO] Setting up Git Hooks for local DevOps workflow...")
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    githooks_dir = os.path.join(repo_root, ".githooks")

    if not os.path.exists(githooks_dir):
        print(f"[ERROR] githooks directory not found: {githooks_dir}")
        sys.exit(1)

    try:
        # Configure git to use .githooks directory
        subprocess.run(["git", "config", "core.hooksPath", ".githooks"], cwd=repo_root, check=True)
        print("[SUCCESS] Configured Git core.hooksPath -> .githooks")
        print("[SUCCESS] Git hooks enabled successfully!")
        print("   - Pre-commit hook: Next.js TypeScript type-check")
        print("   - Pre-push hook: FastAPI Pytest backend test suite")
    except Exception as e:
        print(f"[ERROR] Failed to set git hooks: {e}")

if __name__ == "__main__":
    setup_git_hooks()
