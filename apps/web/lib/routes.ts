/**
 * Bus route geometry for the map. Mirrors simulator/buses/manager.py so the
 * drawn corridors match 100% where the fleet actually runs across the
 * 50 km radius Coimbatore regional transport network.
 */

export interface RouteDefinition {
  id: string;
  corridor: string;
  path: { lat: number; lng: number }[];
}

const p = (lat: number, lng: number) => ({ lat, lng });

export const ROUTES: Record<string, RouteDefinition> = {
  '101': {
    id: '101',
    corridor: 'Mettupalayam – Nilgiri Foothills Express (NH 181)',
    path: [
      p(11.0183, 76.9725), // Gandhipuram
      p(11.0290, 76.9550), // Saibaba Colony
      p(11.0450, 76.9460), // Goundampalayam
      p(11.0780, 76.9380), // Thudiyalur
      p(11.1550, 76.9350), // Periyanaickenpalayam
      p(11.2420, 76.9580), // Karamadai
      p(11.3000, 76.9500), // Mettupalayam
      p(11.3450, 76.9280), // Nilgiri Foothills / Black Thunder
      // Loop return
      p(11.3000, 76.9500),
      p(11.2420, 76.9580),
      p(11.1550, 76.9350),
      p(11.0780, 76.9380),
      p(11.0450, 76.9460),
      p(11.0290, 76.9550),
      p(11.0183, 76.9725),
    ],
  },
  '202': {
    id: '202',
    corridor: 'Tiruppur – Avinashi Regional Highway (NH 544)',
    path: [
      p(11.0183, 76.9725), // Gandhipuram
      p(11.0300, 77.0320), // Airport
      p(11.0650, 77.0850), // KMCH / Neelambur Toll
      p(11.1080, 77.1750), // Karumathampatti
      p(11.1920, 77.2680), // Avinashi Bypass
      p(11.1085, 77.3411), // Tiruppur Bus Stand
      // Loop return
      p(11.1920, 77.2680),
      p(11.1080, 77.1750),
      p(11.0650, 77.0850),
      p(11.0300, 77.0320),
      p(11.0183, 76.9725),
    ],
  },
  '303': {
    id: '303',
    corridor: 'Kinathukadavu – Pollachi Trunk Corridor (NH 83)',
    path: [
      p(10.9885, 76.9585), // Ukkadam
      p(10.9230, 76.9680), // Eachanari Temple
      p(10.8800, 76.9750), // Malumichampatti
      p(10.8210, 76.9850), // Kinathukadavu
      p(10.7020, 77.0080), // Achipatti
      p(10.6580, 77.0050), // Pollachi New Bus Stand
      // Loop return
      p(10.7020, 77.0080),
      p(10.8210, 76.9850),
      p(10.8800, 76.9750),
      p(10.9230, 76.9680),
      p(10.9885, 76.9585),
    ],
  },
  '404': {
    id: '404',
    corridor: 'Saravanampatti – Annur – Sirumugai Line (SH 165)',
    path: [
      p(11.0183, 76.9725), // Gandhipuram
      p(11.0380, 76.9780), // Ganapathy
      p(11.0820, 76.9950), // Saravanampatti IT Park
      p(11.1650, 77.0420), // Kunnathur
      p(11.2320, 77.1050), // Annur Town
      p(11.3250, 77.0050), // Sirumugai Transit Hub
      // Loop return
      p(11.2320, 77.1050),
      p(11.1650, 77.0420),
      p(11.0820, 76.9950),
      p(11.0380, 76.9780),
      p(11.0183, 76.9725),
    ],
  },
  '505': {
    id: '505',
    corridor: 'Walayar – Palakkad Interstate Transit (NH 544 West)',
    path: [
      p(10.9885, 76.9585), // Ukkadam
      p(10.9580, 76.9500), // Kuniyamuthur
      p(10.9150, 76.9120), // Kovaipudur
      p(10.8750, 76.8580), // KG Chavadi Toll
      p(10.8420, 76.8200), // Walayar TN-KL Border
      p(10.8050, 76.7550), // Kanjikode
      // Loop return
      p(10.8420, 76.8200),
      p(10.8750, 76.8580),
      p(10.9150, 76.9120),
      p(10.9580, 76.9500),
      p(10.9885, 76.9585),
    ],
  },
  '606': {
    id: '606',
    corridor: 'Sulur Airbase – Palladam Belt (NH 81)',
    path: [
      p(11.0015, 77.0285), // Singanallur
      p(11.0030, 77.0520), // Ondipudur
      p(11.0250, 77.1250), // Sulur Air Force Base
      p(11.0150, 77.2100), // Karanampettai
      p(10.9980, 77.2850), // Palladam Town
      // Loop return
      p(11.0150, 77.2100),
      p(11.0250, 77.1250),
      p(11.0030, 77.0520),
      p(11.0015, 77.0285),
    ],
  },
  '14C': {
    id: '14C',
    corridor: 'Town Hall – R.S. Puram – Marudhamalai Foothills',
    path: [
      p(10.9885, 76.9585), // Ukkadam
      p(10.9978, 76.9617), // Town Hall
      p(11.0055, 76.9515), // R.S. Puram
      p(11.0180, 76.9200), // Lawley Road TNAU
      p(11.0310, 76.8900), // Vadavalli
      p(11.0450, 76.8520), // Marudhamalai Temple Foothills
      // Loop return
      p(11.0310, 76.8900),
      p(11.0180, 76.9200),
      p(11.0055, 76.9515),
      p(10.9978, 76.9617),
      p(10.9885, 76.9585),
    ],
  },
  '21A': {
    id: '21A',
    corridor: 'Gandhipuram – Avinashi Road – Airport – KMCH',
    path: [
      p(11.0183, 76.9725),
      p(11.0134, 76.9865),
      p(11.0170, 76.9975),
      p(11.0270, 77.0080),
      p(11.0290, 77.0160),
      p(11.0303, 77.0230),
      p(11.0450, 77.0550),
      // Loop return
      p(11.0303, 77.0230),
      p(11.0290, 77.0160),
      p(11.0270, 77.0080),
      p(11.0170, 76.9975),
      p(11.0134, 76.9865),
      p(11.0183, 76.9725),
    ],
  },
  '70': {
    id: '70',
    corridor: 'Coimbatore Ring Corridor – Ganapathy – Ramanathapuram',
    path: [
      p(11.0183, 76.9725),
      p(11.0160, 76.9680),
      p(11.0290, 76.9550),
      p(11.0380, 76.9780),
      p(11.0002, 76.9885),
      p(10.9950, 76.9820),
      p(10.9885, 76.9585),
      p(11.0183, 76.9725),
    ],
  },
  '45': {
    id: '45',
    corridor: 'Trichy Road Expressway – Singanallur – Town Hall',
    path: [
      p(11.0015, 77.0285),
      p(11.0010, 77.0120),
      p(11.0000, 76.9885),
      p(10.9950, 76.9810),
      p(10.9978, 76.9617),
      // Loop return
      p(10.9950, 76.9810),
      p(11.0000, 76.9885),
      p(11.0010, 77.0120),
      p(11.0015, 77.0285),
    ],
  },
};

/** Regional center of Coimbatore transit network. */
export const CITY_CENTER = { lat: 11.0150, lng: 76.9800 };
export const CITY_NAME = 'Coimbatore Regional transit network (50 km radius)';

export function getRoute(routeName: string): RouteDefinition | undefined {
  if (!routeName) return undefined;
  const clean = routeName.trim();
  if (ROUTES[clean]) return ROUTES[clean];
  
  // Match exact ID inside routeName string
  for (const id of Object.keys(ROUTES)) {
    if (clean === id || clean.endsWith(` ${id}`) || clean.startsWith(`${id} `) || clean.includes(`Route ${id}`)) {
      return ROUTES[id];
    }
  }

  const match = Object.keys(ROUTES).find((id) =>
    clean.toUpperCase().includes(id.toUpperCase())
  );
  return match ? ROUTES[match] : undefined;
}

export function routeCorridor(routeName: string): string {
  return getRoute(routeName)?.corridor ?? routeName;
}
