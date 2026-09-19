import type { MapStyleKey } from '@/types';

/**
 * Street map retoned to sit under the console chrome: low-chroma navy land,
 * darker water, roads kept brighter than their surroundings so the network
 * still reads at a glance.
 */
export const DARK_STREETS: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#151D26' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9DAEBC' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0B0E12' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#33404D' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#A9B8C5' }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6C7B88' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#18251E' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#28333F' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#36434F' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#45545F' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#53626F' }] },
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#222C36' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#232F3A' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0E1A24' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3E5566' }] },
];

export const LIGHT_STREETS: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#334155' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#1e293b' }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e2f1e8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#f1f5f9' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e2e8f0' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#e2e8f0' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cbe5f6' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#0284c7' }] },
];

const LABELS_OFF: google.maps.MapTypeStyle[] = [
  { elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

/**
 * Satellite imagery carries no labels of its own; hybrid is the labelled
 * variant. So the labels switch chooses between the two rather than pretending
 * to restyle imagery.
 */
export function resolveMapTypeId(style: MapStyleKey, labels: boolean): string {
  if (style === 'streets') return 'roadmap';
  if (style === 'satellite') return labels ? 'hybrid' : 'satellite';
  return labels ? 'hybrid' : 'satellite';
}

export function resolveStyles(
  style: MapStyleKey,
  labels: boolean,
  theme: 'dark' | 'light' = 'dark'
): google.maps.MapTypeStyle[] {
  if (style !== 'streets') return [];
  const base = theme === 'light' ? LIGHT_STREETS : DARK_STREETS;
  return labels ? base : [...base, ...LABELS_OFF];
}

export const MAP_STYLE_LABELS: Record<MapStyleKey, string> = {
  satellite: 'Satellite',
  streets: 'Streets',
  hybrid: 'Hybrid',
};
