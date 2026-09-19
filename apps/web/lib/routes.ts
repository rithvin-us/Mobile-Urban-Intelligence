/**
 * Bus route geometry for the map. Mirrors simulator/buses/manager.py so the
 * drawn corridors match 100% where the fleet actually runs.
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
    corridor: 'Gandhipuram – Avinashi Road – Airport (NH 544)',
    path: [
      p(11.0183, 76.9725),
      p(11.0160, 76.9735),
      p(11.0135, 76.9762),
      p(11.0134, 76.9865),
      p(11.0150, 76.9920),
      p(11.0170, 76.9975),
      p(11.0210, 77.0020),
      p(11.0270, 77.0080),
      p(11.0290, 77.0160),
      p(11.0303, 77.0230),
      p(11.0300, 77.0320),
      p(11.0295, 77.0410),
      p(11.0300, 77.0320),
      p(11.0303, 77.0230),
      p(11.0290, 77.0160),
      p(11.0270, 77.0080),
      p(11.0210, 77.0020),
      p(11.0170, 76.9975),
      p(11.0150, 76.9920),
      p(11.0134, 76.9865),
      p(11.0135, 76.9762),
      p(11.0160, 76.9735),
      p(11.0183, 76.9725),
    ],
  },
  '14C': {
    id: '14C',
    corridor: 'Ukkadam – Town Hall – R.S. Puram – Saibaba Colony',
    path: [
      p(10.9885, 76.9585),
      p(10.9935, 76.9605),
      p(10.9978, 76.9617),
      p(11.0005, 76.9580),
      p(11.0035, 76.9540),
      p(11.0055, 76.9515),
      p(11.0075, 76.9497),
      p(11.0140, 76.9480),
      p(11.0200, 76.9470),
      p(11.0250, 76.9550),
      p(11.0200, 76.9470),
      p(11.0140, 76.9480),
      p(11.0075, 76.9497),
      p(11.0055, 76.9515),
      p(11.0035, 76.9540),
      p(11.0005, 76.9580),
      p(10.9978, 76.9617),
      p(10.9935, 76.9605),
      p(10.9885, 76.9585),
    ],
  },
  '70': {
    id: '70',
    corridor: '100 Feet Road ring – Gandhipuram – Ramanathapuram – Sungam',
    path: [
      p(11.0183, 76.9725),
      p(11.0160, 76.9680),
      p(11.0112, 76.9773),
      p(11.0050, 76.9820),
      p(11.0002, 76.9885),
      p(10.9950, 76.9820),
      p(10.9905, 76.9750),
      p(10.9930, 76.9680),
      p(10.9978, 76.9617),
      p(11.0080, 76.9670),
      p(11.0183, 76.9725),
    ],
  },
  '3B': {
    id: '3B',
    corridor: 'Mettupalayam Road (NH 181) – Gandhipuram – Thudiyalur',
    path: [
      p(11.0183, 76.9725),
      p(11.0210, 76.9640),
      p(11.0230, 76.9585),
      p(11.0290, 76.9550),
      p(11.0355, 76.9520),
      p(11.0450, 76.9460),
      p(11.0530, 76.9430),
      p(11.0595, 76.9410),
      p(11.0530, 76.9430),
      p(11.0450, 76.9460),
      p(11.0355, 76.9520),
      p(11.0290, 76.9550),
      p(11.0230, 76.9585),
      p(11.0210, 76.9640),
      p(11.0183, 76.9725),
    ],
  },
  '45': {
    id: '45',
    corridor: 'Trichy Road (NH 83) – Singanallur – Sungam – Town Hall',
    path: [
      p(11.0015, 77.0285),
      p(11.0010, 77.0120),
      p(11.0005, 77.0000),
      p(11.0000, 76.9885),
      p(10.9950, 76.9810),
      p(10.9905, 76.9755),
      p(10.9935, 76.9680),
      p(10.9978, 76.9617),
      p(10.9935, 76.9680),
      p(10.9905, 76.9755),
      p(10.9950, 76.9810),
      p(11.0000, 76.9885),
      p(11.0005, 77.0000),
      p(11.0010, 77.0120),
      p(11.0015, 77.0285),
    ],
  },
  S7: {
    id: 'S7',
    corridor: 'Palakkad Road (NH 544) – Kuniyamuthur – Ukkadam – Gandhipuram',
    path: [
      p(10.9525, 76.9470),
      p(10.9580, 76.9500),
      p(10.9635, 76.9540),
      p(10.9720, 76.9555),
      p(10.9780, 76.9565),
      p(10.9885, 76.9585),
      p(10.9935, 76.9605),
      p(10.9978, 76.9617),
      p(11.0080, 76.9670),
      p(11.0183, 76.9725),
      p(11.0080, 76.9670),
      p(10.9978, 76.9617),
      p(10.9935, 76.9605),
      p(10.9885, 76.9585),
      p(10.9780, 76.9565),
      p(10.9720, 76.9555),
      p(10.9635, 76.9540),
      p(10.9580, 76.9500),
      p(10.9525, 76.9470),
    ],
  },
};

/** City centre fallback before any telemetry has arrived. */
export const CITY_CENTER = { lat: 11.0075, lng: 76.9825 };
export const CITY_NAME = 'Coimbatore';

export function getRoute(routeName: string): RouteDefinition | undefined {
  if (!routeName) return undefined;
  if (ROUTES[routeName]) return ROUTES[routeName];
  const match = Object.keys(ROUTES).find((id) =>
    routeName.toUpperCase().includes(id.toUpperCase())
  );
  return match ? ROUTES[match] : undefined;
}

export function routeCorridor(routeName: string): string {
  return getRoute(routeName)?.corridor ?? routeName;
}
