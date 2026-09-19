# Deployment

Live environment for the SIH26124 Urban Intelligence platform.

| Piece | URL | Host |
|---|---|---|
| Dashboard | https://urban-intelligence-dashboard-one.vercel.app/dashboard | Vercel |
| API | https://urban-intel-api.onrender.com | Render (Singapore) |
| API health | https://urban-intel-api.onrender.com/health/system | Render |
| Database | `urban-intelligence-db` | Render Postgres 16 (Singapore) |

Both redeploy automatically on every push to `main`.

## Keeping the map alive without a laptop

Set `DEMO_MODE=1` on the Render service. The API then drives the same fleet
from inside the container: buses keep moving and detections keep arriving with
nothing running on anyone's machine. Tune it with `DEMO_STEP_SECONDS` (default
3), `DEMO_FLEET_SIZE` (24) and `DEMO_EVENT_CAP` (4000, the point at which the
oldest detections are pruned).

It is off unless the flag is set, so real edge deployments never see it. Note
that a free Render service still sleeps after 15 minutes without a visitor; the
feed resumes when the next person opens the dashboard, a few seconds after the
container wakes.

## Showing it to the team

The deployed database only fills up while something is feeding it. Point the
simulator at the live API from any machine:

```bash
API_BASE_URL=https://urban-intel-api.onrender.com python simulator/main.py
```

Buses start moving on the map within a few seconds. Stop the simulator and the
fleet goes idle, then offline after 30 seconds without telemetry — that is the
dashboard reporting the truth, not a bug.

Keep the simulator running for the whole demo: it also stops the free Render
instance from sleeping.

## Environment variables

**Render — `urban-intel-api`**

| Key | Value |
|---|---|
| `DATABASE_URL` | Internal connection string of `urban-intelligence-db` |
| `CORS_ORIGINS` | `*` for the demo; set to the dashboard origin before wider use |
| `PYTHONUNBUFFERED` | `1`, so logs stream rather than buffer |

Without `DATABASE_URL` the API falls back to SQLite inside the container, which
is wiped whenever the instance restarts. Set it from the Render dashboard:
**Environment → Add from database → urban-intelligence-db → Internal URL**.

**Vercel — `urban-intelligence-dashboard`**

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `https://urban-intel-api.onrender.com` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Browser key for Maps JavaScript + Geocoding |

Both are compiled into the browser bundle, so a change needs a redeploy to take
effect, and the Maps key is readable by anyone who opens the page. Restrict it
in Google Cloud Console to the dashboard's domain and cap its quota.

## Known limits of the free tier

- The API sleeps after 15 minutes of inactivity; the first request afterwards
  takes roughly 50 seconds while the container wakes.
- The free Postgres instance expires 30 days after creation.
- Without Postgres wired in, detections do not survive a restart.
