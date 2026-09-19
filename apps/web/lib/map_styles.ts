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

export function resolveStyles(style: MapStyleKey, labels: boolean): google.maps.MapTypeStyle[] {
  if (style !== 'streets') return [];
  return labels ? DARK_STREETS : [...DARK_STREETS, ...LABELS_OFF];
}

export const MAP_STYLE_LABELS: Record<MapStyleKey, string> = {
  satellite: 'Satellite',
  streets: 'Streets',
  hybrid: 'Hybrid',
};
