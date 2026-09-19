/**
 * Bus route geometry for the map. Mirrors simulator/buses/manager.py so the
 * drawn corridors match where the fleet actually runs. When real depots supply
 * route geometry this file is the single place to swap.
 */

export interface RouteDefinition {
  id: string;
  corridor: string;
  path: { lat: number; lng: number }[];
}

const p = (lat: number, lng: number) => ({ lat, lng });

export const ROUTES: Record<string, RouteDefinition> = {
  '21A': {
    id: '21A',
    corridor: 'Gandhipuram – Avinashi Road – Airport',
    path: [
      p(11.0183, 76.9725),
      p(11.0135, 76.9762),
      p(11.0134, 76.9865),
      p(11.017, 76.9975),
      p(11.027, 77.008),
      p(11.0303, 77.023),
      p(11.0295, 77.041),
    ],
  },
  '14C': {
    id: '14C',
    corridor: 'Ukkadam – Town Hall – R.S. Puram – Saibaba Colony',
    path: [
      p(10.9885, 76.9585),
      p(10.9978, 76.9617),
      p(11.0035, 76.954),
      p(11.0075, 76.9497),
      p(11.02, 76.947),
    ],
  },
  '70': {
    id: '70',
    corridor: '100 Feet Road ring – Gandhipuram – Ramanathapuram – Sungam',
    path: [
      p(11.0183, 76.9725),
      p(11.0112, 76.9773),
      p(11.0002, 76.9885),
      p(10.9905, 76.975),
      p(10.9978, 76.9617),
      p(11.0183, 76.9725),
    ],
  },
  '3B': {
    id: '3B',
    corridor: 'Mettupalayam Road – Gandhipuram – Thudiyalur',
    path: [
      p(11.0183, 76.9725),
      p(11.023, 76.9585),
      p(11.0355, 76.952),
      p(11.0595, 76.941),
    ],
  },
  '45': {
    id: '45',
    corridor: 'Trichy Road – Singanallur – Sungam – Town Hall',
    path: [
      p(11.0015, 77.0285),
      p(11.0, 76.9885),
      p(10.9905, 76.9755),
      p(10.9978, 76.9617),
    ],
  },
  S7: {
    id: 'S7',
    corridor: 'Kuniyamuthur – Ukkadam – Gandhipuram',
    path: [
      p(10.9525, 76.947),
      p(10.9635, 76.954),
      p(10.9885, 76.9585),
      p(10.9978, 76.9617),
      p(11.0183, 76.9725),
    ],
  },
};

/** City centre fallback before any telemetry has arrived. */
export const CITY_CENTER = { lat: 11.0075, lng: 76.9825 };
export const CITY_NAME = 'Coimbatore';

export function getRoute(routeName: string): RouteDefinition | undefined {
  if (!routeName) return undefined;
  if (ROUTES[routeName]) return ROUTES[routeName];
  // Tolerate names like "Route 21A - Airport Corridor" from older payloads.
  const match = Object.keys(ROUTES).find((id) =>
    routeName.toUpperCase().includes(id.toUpperCase())
  );
  return match ? ROUTES[match] : undefined;
}

export function routeCorridor(routeName: string): string {
  return getRoute(routeName)?.corridor ?? routeName;
}
