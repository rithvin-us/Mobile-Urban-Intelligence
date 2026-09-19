import type { FleetState } from '@/types';

/**
 * Map markers drawn from the actual bus model.
 *
 * Google's raster maps cannot rotate an image marker, so the model is rendered
 * once in the browser at fixed heading steps and the frames are reused as
 * marker icons. One render pass, then every bus is a cheap image swap.
 */

export const SPRITE_STEPS = 36; // one frame per 10 degrees
export const SPRITE_PX = 72; // rendered size, drawn on the map at ~half this

type SpriteSet = string[];

export type SpriteVariant = FleetState | 'SELECTED';

const RING: Record<SpriteVariant, { ring: string; glow: string }> = {
  ACTIVE: { ring: '#4C86C6', glow: 'rgba(76,134,198,0.30)' },
  IDLE: { ring: '#C9922F', glow: 'rgba(201,146,47,0.26)' },
  OFFLINE: { ring: '#68798A', glow: 'rgba(104,121,138,0.20)' },
  SELECTED: { ring: '#EAF2FA', glow: 'rgba(234,242,250,0.34)' },
};

const CACHE_KEY = 'bus-sprites-v1';

let buildPromise: Promise<Record<SpriteVariant, SpriteSet> | null> | null = null;

function readCache(): Record<SpriteVariant, SpriteSet> | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.ACTIVE?.length === SPRITE_STEPS ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(frames: Record<SpriteVariant, SpriteSet>) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(frames));
  } catch {
    // Storage is optional; the sprites simply get rebuilt next time.
  }
}

export function headingFrame(heading: number): number {
  const normalised = ((heading % 360) + 360) % 360;
  return Math.round(normalised / (360 / SPRITE_STEPS)) % SPRITE_STEPS;
}

function composite(model: HTMLCanvasElement, variant: SpriteVariant): string {
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_PX;
  canvas.height = SPRITE_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const centre = SPRITE_PX / 2;
  const { ring, glow } = RING[variant];

  // A soft disc lifts the vehicle off dark imagery without glowing.
  const gradient = ctx.createRadialGradient(centre, centre, 2, centre, centre, centre);
  gradient.addColorStop(0, glow);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centre, centre, centre, 0, Math.PI * 2);
  ctx.fill();

  // Status ring carries the fleet state that the model itself cannot show.
  ctx.strokeStyle = ring;
  ctx.lineWidth = variant === 'SELECTED' ? 2.4 : 1.8;
  ctx.beginPath();
  ctx.arc(centre, centre, centre - 6, 0, Math.PI * 2);
  ctx.stroke();

  ctx.drawImage(model, 0, 0, SPRITE_PX, SPRITE_PX);
  return canvas.toDataURL('image/png');
}

async function build(): Promise<Record<SpriteVariant, SpriteSet> | null> {
  if (typeof window === 'undefined') return null;

  const cached = readCache();
  if (cached) return cached;

  try {
    const THREE = await import('three');
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');

    // The canvas is read back with drawImage, so the drawing buffer has to
    // survive past the render call.
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(SPRITE_PX, SPRITE_PX);
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xBcd6ee, 1.15));
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(2, 4, 3);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9fc4ea, 0.9);
    fill.position.set(-3, 2, -2);
    scene.add(fill);

    const gltf = await new GLTFLoader().loadAsync('/models/bus.glb');
    const model = gltf.scene;

    // Normalise the model: longest axis one unit, then recentre on the origin.
    // Scaling first matters — a model authored away from the origin would
    // otherwise end up outside the camera frustum.
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const longest = Math.max(size.x, size.y, size.z) || 1;
    model.scale.setScalar(1 / longest);

    const scaledBox = new THREE.Box3().setFromObject(model);
    const scaledCentre = scaledBox.getCenter(new THREE.Vector3());
    model.position.sub(scaledCentre);

    (window as any).__busSprite = {
      size: [size.x, size.y, size.z],
      centre: [scaledCentre.x, scaledCentre.y, scaledCentre.z],
      meshes: (() => {
        let count = 0;
        model.traverse((node: any) => {
          if (node.isMesh) count += 1;
        });
        return count;
      })(),
    };

    // Point the vehicle's long axis north so a heading of 0 faces up.
    const pivot = new THREE.Group();
    pivot.add(model);
    if (size.x > size.z) pivot.rotation.y = Math.PI / 2;
    scene.add(pivot);

    // Looking down at a shallow angle keeps the roof readable while the body
    // still reads as a vehicle rather than a rectangle.
    const camera = new THREE.OrthographicCamera(-0.62, 0.62, 0.62, -0.62, 0.01, 14);
    camera.position.set(0, 3.1, 1.15);
    camera.lookAt(0, 0, 0);

    const variants: SpriteVariant[] = ['ACTIVE', 'IDLE', 'OFFLINE', 'SELECTED'];
    const frames: Record<SpriteVariant, SpriteSet> = {
      ACTIVE: [],
      IDLE: [],
      OFFLINE: [],
      SELECTED: [],
    };

    for (let step = 0; step < SPRITE_STEPS; step += 1) {
      // Map compass heading (clockwise from north) to the scene's rotation.
      pivot.rotation.y = (size.x > size.z ? Math.PI / 2 : 0) - (step * (Math.PI * 2)) / SPRITE_STEPS;
      renderer.render(scene, camera);
      const rendered = renderer.domElement;
      for (const variant of variants) {
        frames[variant].push(composite(rendered, variant));
      }
    }

    // Hand the WebGL context back straight away: the sprites are plain images
    // from here on, and a page does not need to hold a live context open.
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.width = 1;
    renderer.domElement.height = 1;

    writeCache(frames);
    return frames;
  } catch (err) {
    (window as any).__busSpriteError = err instanceof Error ? err.message : String(err);
    console.warn('Bus model could not be prepared; falling back to plain markers', err);
    return null;
  }
}

/** Renders the sprite sheet once and reuses it for the life of the page. */
export function busSprites(): Promise<Record<SpriteVariant, SpriteSet> | null> {
  if (!buildPromise) buildPromise = build();
  return buildPromise;
}
