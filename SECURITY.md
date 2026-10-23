# Security Policy

## Supported versions

| Version | Supported |
| :--- | :--- |
| 1.0.x | Yes |
| < 1.0 | No |

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Report it through GitHub's private vulnerability reporting, under the
repository's **Security** tab, or by contacting the maintainers directly. A
report is most useful when it includes the affected component (edge unit,
backend API, or dashboard), the steps to reproduce, and what an attacker gains.

Expect an acknowledgement within 72 hours and an assessment within seven days.

## Scope notes for deployments

This platform ingests telemetry from vehicles in the field, so a few things
matter more here than in a typical web application:

- **Telemetry endpoints are unauthenticated by default.** `POST /api/buses/telemetry`
  and `POST /api/events` accept anything that can reach them. Before any public
  deployment, put them behind mutual TLS or a gateway that verifies the edge
  unit's device certificate, or anyone can inject fleet positions and hazards.
- **Location data is personal data.** A bus trace is also a driver's movement
  history. Apply retention limits and access controls appropriate to your
  jurisdiction before storing it long term.
- **`DEMO_MODE` must be off in production.** It synthesises fleet movement and
  hazard events, which would corrupt a real municipal dataset.
- **Do not commit API keys.** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is exposed to
  the browser by design; restrict it by HTTP referrer in the Google Cloud
  console rather than relying on secrecy.
