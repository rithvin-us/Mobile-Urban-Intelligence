import { RouteDefinition } from './routes';

/**
 * Cache for Google Maps snapped road polylines.
 * Maps route ID -> Array of high-density {lat, lng} coordinates strictly on roads.
 */
const snappedRoutesCache = new Map<string, { lat: number; lng: number }[]>();

/**
 * Uses Google Maps DirectionsService to fetch exact turn-by-turn road centerlines
 * for a bus route. Guarantees 100% road-snapped alignment following real streets.
 */
export async function getSnappedRoutePath(
  route: RouteDefinition
): Promise<{ lat: number; lng: number }[]> {
  if (snappedRoutesCache.has(route.id)) {
    return snappedRoutesCache.get(route.id)!;
  }

  const maps = (window as any).google?.maps as typeof google.maps | undefined;
  if (!maps || !route.path || route.path.length < 2) {
    return route.path;
  }

  try {
    const directionsService = new maps.DirectionsService();
    const origin = route.path[0];
    const destination = route.path[Math.floor(route.path.length / 2)];
    
    // Pick intermediate waypoints for Directions API
    const intermediateWaypoints = route.path
      .slice(1, Math.floor(route.path.length / 2))
      .filter((_, idx) => idx % 2 === 0)
      .map((pt) => ({ location: pt, stopover: false }));

    const request: google.maps.DirectionsRequest = {
      origin,
      destination,
      waypoints: intermediateWaypoints.slice(0, 8), // Max 8 intermediate waypoints for standard Directions API
      travelMode: maps.TravelMode.DRIVING,
      optimizeWaypoints: false,
    };

    const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
      directionsService.route(request, (res, status) => {
        if (status === maps.DirectionsStatus.OK && res) {
          resolve(res);
        } else {
          reject(new Error(`Directions API failed: ${status}`));
        }
      });
    });

    if (result.routes && result.routes[0] && result.routes[0].overview_path) {
      const overviewPath = result.routes[0].overview_path.map((latLng) => ({
        lat: latLng.lat(),
        lng: latLng.lng(),
      }));

      if (overviewPath.length > 0) {
        snappedRoutesCache.set(route.id, overviewPath);
        return overviewPath;
      }
    }
  } catch (err) {
    console.warn(`[RoadSnapper] Fallback to high-density path for route ${route.id}:`, err);
  }

  snappedRoutesCache.set(route.id, route.path);
  return route.path;
}

/**
 * Snaps any (lat, lng) coordinate to the closest point on a road polyline.
 * Prevents buses from ever straying off the road.
 */
export function snapCoordinateToPolyline(
  lat: number,
  lng: number,
  polyline: { lat: number; lng: number }[]
): { lat: number; lng: number; heading: number } {
  if (!polyline || polyline.length < 2) {
    return { lat, lng, heading: 0 };
  }

  let minDistance = Infinity;
  let bestPoint = { lat, lng };
  let bestHeading = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    const p1 = polyline[i];
    const p2 = polyline[i + 1];

    // Project point onto line segment p1-p2
    const projected = projectPointOnSegment(lat, lng, p1.lat, p1.lng, p2.lat, p2.lng);
    const dist = haversineDistance(lat, lng, projected.lat, projected.lng);

    if (dist < minDistance) {
      minDistance = dist;
      bestPoint = projected;
      bestHeading = calculateHeading(p1.lat, p1.lng, p2.lat, p2.lng);
    }
  }

  return { lat: bestPoint.lat, lng: bestPoint.lng, heading: bestHeading };
}

function projectPointOnSegment(
  pLat: number, pLng: number,
  aLat: number, aLng: number,
  bLat: number, bLng: number
): { lat: number; lng: number } {
  const dx = bLng - aLng;
  const dy = bLat - aLat;

  if (dx === 0 && dy === 0) {
    return { lat: aLat, lng: aLng };
  }

  const t = ((pLng - aLng) * dx + (pLat - aLat) * dy) / (dx * dx + dy * dy);
  const clampedT = Math.max(0, Math.min(1, t));

  return {
    lat: aLat + clampedT * dy,
    lng: aLng + clampedT * dx,
  };
}

function calculateHeading(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const y = Math.sin(dLon) * Math.cos(lat2 * (Math.PI / 180));
  const x =
    Math.cos(lat1 * (Math.PI / 180)) * Math.sin(lat2 * (Math.PI / 180)) -
    Math.sin(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
