# Contributing

Thanks for taking an interest in the project. This guide covers how to get the
stack running locally and what a change needs before it can be merged.

## Repository layout

```
apps/api          FastAPI backend, PostGIS persistence, WebSocket fan-out
apps/web          Next.js 14 operator dashboard
edge              Jetson edge AI: YOLOv8 inference, tracking, store-and-forward
simulator         Synthetic fleet telemetry producer
matlab sims       MATLAB and Simulink validation models
packages          Shared TypeScript config and types
infrastructure    Database initialisation SQL
docs              Architecture, deployment and audit documents
scripts           Developer tooling
```

## Local setup

The stack needs Python 3.10+, Node 20 with pnpm 8+, and Docker.

```sh
# 1. Databases
docker compose up -d postgres redis

# 2. Backend
python -m venv .venv && . .venv/bin/activate
pip install -r apps/api/requirements.txt
cp .env.example .env            # then set DEMO_MODE=1 for a self-driving demo
cd apps/api && uvicorn app.main:app --port 8000

# 3. Dashboard
pnpm install
cp apps/web/.env.example apps/web/.env.local   # add your Google Maps API key
pnpm --filter web dev
```

The dashboard needs a real `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. Without one the
map panel renders an error instead of the fleet; everything else still works.

### Edge AI

The edge dependencies are deliberately kept out of the API container, because
PyTorch and Ultralytics add gigabytes that a backend image has no use for.

```sh
python -m venv .venv-edge && . .venv-edge/bin/activate
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install -r edge/requirements.txt
pytest edge/test_detector.py
```

### MATLAB and Simulink

Requires base MATLAB R2021a or later plus Simulink. No additional toolboxes are
used, and none are required. See `matlab sims/README.md` for what each model
does.

```sh
matlab -batch "cd('matlab sims'); pothole_imu_sim"
matlab -batch "cd('matlab sims'); build_models"
```

## Before you open a pull request

CI runs these, so run them first and save yourself a round trip:

```sh
ruff check apps/api --ignore E501      # backend lint
cd apps/api && pytest                  # backend tests
pnpm --filter web type-check           # dashboard types
pnpm --filter web build                # dashboard production build
pytest edge/test_detector.py           # edge AI, needs .venv-edge
```

## Conventions

- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org):
  `fix:`, `feat:`, `docs:`, `refactor:`, `test:`, `chore:`. The scope is the
  component, for example `feat(edge-ai):` or `fix(api):`.
- **Comments explain why, not what.** The code already says what it does. A
  comment earns its place by recording the constraint, the bug, or the
  measurement that made the code look like this.
- **Do not commit secrets.** `.env` and `.env.local` are ignored; keep it that
  way. `.env.example` documents every variable with a safe placeholder.
- **Generated artefacts stay out of git.** Simulation figures, annotated video
  output and build directories are ignored by design.

## Reporting bugs

Open an issue using the bug report template. For anything with a security
impact, follow [SECURITY.md](SECURITY.md) instead of filing a public issue.
