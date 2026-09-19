'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface SensorHotspot {
  id: string;
  name: string;
  position: [number, number, number];
  description: string;
  hardwareSpec: string;
  category: 'camera' | 'compute' | 'gps' | 'telematics' | 'safety';
}

export const SENSOR_HOTSPOTS: SensorHotspot[] = [
  {
    id: 'front-cam',
    name: 'Front Optical AI Camera',
    position: [0, 1.4, 3.8],
    description: '1080p 60FPS WDR Sony STARVIS Optical Sensor for real-time road surface defect & anomaly detection.',
    hardwareSpec: 'Sony STARVIS IMX335 • 120° FOV • HDR • CSI-2 Interface',
    category: 'camera'
  },
  {
    id: 'edge-compute',
    name: 'NVIDIA Jetson Orin Edge AI Unit',
    position: [0, 0.4, 3.2],
    description: 'Onboard edge AI computer executing TensorRT compiled YOLOv8 detection & ByteTrack multi-object tracking.',
    hardwareSpec: 'NVIDIA Jetson Orin Nano (8GB) • 40 TOPS • INT8 Engine • 15W TDP',
    category: 'compute'
  },
  {
    id: 'gps-receiver',
    name: 'Roof NMEA GNSS / GPS Antenna',
    position: [0, 2.2, 1.5],
    description: 'High-precision dual-band GNSS receiver streaming NMEA-0183 spatial telemetry (latitude, longitude, speed, heading).',
    hardwareSpec: 'u-blox ZED-F9P • RTK Capable • 20Hz Update Rate • Active Patch Antenna',
    category: 'gps'
  },
  {
    id: 'telematics-gateway',
    name: '4G LTE / 5G Telematics Modem',
    position: [0, 2.2, -2.0],
    description: 'Low-latency cellular telematics unit for pushing MQTT events and HTTPS telemetry to central PostGIS backend.',
    hardwareSpec: 'Quectel RM500Q-GL 5G NR • Dual SIM • MQTT/mTLS Encryption',
    category: 'telematics'
  },
  {
    id: 'rear-safety',
    name: 'Rear & Side Proximity LiDAR/Radar',
    position: [0, 0.5, -4.2],
    description: 'Auxiliary environmental radar sensors monitoring blindspots, rear traffic density, and pedestrian proximity.',
    hardwareSpec: '77GHz Millimeter Wave Radar • 150m Range • IP69K Waterproof',
    category: 'safety'
  }
];

interface BusModelViewerProps {
  modelUrl?: string;
  explosionFactor?: number; // 0 (normal) to 1 (fully exploded)
  selectedSensorId?: string | null;
  onSelectSensor?: (sensor: SensorHotspot | null) => void;
  autoRotate?: boolean;
  busHeading?: number;
  interactiveHotspots?: boolean;
  className?: string;
}

export const BusModelViewer: React.FC<BusModelViewerProps> = ({
  modelUrl = '/bharat-bus-av.glb',
  explosionFactor = 0,
  selectedSensorId = null,
  onSelectSensor,
  autoRotate = false,
  busHeading = 0,
  interactiveHotspots = true,
  className = 'w-full h-full min-h-[350px]'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const originalPositionsRef = useRef<Map<THREE.Object3D, THREE.Vector3>>(new Map());
  const hotspotsGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth || 600;
    const height = containerRef.current.clientHeight || 400;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a'); // Dark slate slate-900 background
    sceneRef.current = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(7, 4, 9);
    cameraRef.current = camera;

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    // 4. OrbitControls Setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Don't sink below ground level
    controls.minDistance = 3;
    controls.maxDistance = 25;
    controlsRef.current = controls;

    // 5. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.5);
    mainLight.position.set(10, 15, 10);
    mainLight.castShadow = true;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.0); // Soft cyan rim light
    fillLight.position.set(-10, 10, -10);
    scene.add(fillLight);

    const blueSpot = new THREE.PointLight(0x2563eb, 3.0, 15);
    blueSpot.position.set(0, 5, 0);
    scene.add(blueSpot);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(30, 30, 0x3b82f6, 0x1e293b);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Hotspot Group
    const hotspotsGroup = new THREE.Group();
    scene.add(hotspotsGroup);
    hotspotsGroupRef.current = hotspotsGroup;

    // 6. Load GLTF 3D Model
    const loader = new GLTFLoader();
    setLoading(true);
    setError(null);

    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;
        modelGroupRef.current = model;

        // Auto-center and scale model so bottom rests on grid floor (y = 0)
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        model.position.x = -center.x;
        model.position.y = -box.min.y;
        model.position.z = -center.z;

        // Store original positions for exploding animation
        const originalMap = new Map<THREE.Object3D, THREE.Vector3>();
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            originalMap.set(child, child.position.clone());
          }
        });
        originalPositionsRef.current = originalMap;

        scene.add(model);

        // Adjust camera position based on bounding box to look at center of bus
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
        camera.position.set(cameraZ * 0.8, size.y * 0.6 + cameraZ * 0.4, cameraZ * 1.1);
        controls.target.set(0, size.y * 0.5, 0);
        controls.update();

        // Render Sensor Hotspot Pins
        renderHotspots();

        setLoading(false);
      },
      undefined,
      (err) => {
        console.warn('GLB model failed to load, generating procedural 3D Bharat Bus fallback:', err);
        // Build Procedural 3D Bus Fallback
        const fallbackGroup = new THREE.Group();
        
        // Chassis Body
        const bodyGeo = new THREE.BoxGeometry(2.4, 1.8, 6.0);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.3, roughness: 0.2 });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.set(0, 1.3, 0);
        fallbackGroup.add(bodyMesh);

        // Windshield & Windows
        const glassGeo = new THREE.BoxGeometry(2.3, 0.8, 5.8);
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6, roughness: 0.1 });
        const glassMesh = new THREE.Mesh(glassGeo, glassMat);
        glassMesh.position.set(0, 1.7, 0);
        fallbackGroup.add(glassMesh);

        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 24);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
        
        const wheelPositions = [
          [-1.2, 0.45, 1.8], [1.2, 0.45, 1.8],
          [-1.2, 0.45, -1.8], [1.2, 0.45, -1.8]
        ];
        
        wheelPositions.forEach(([x, y, z]) => {
          const wheel = new THREE.Mesh(wheelGeo, wheelMat);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(x, y, z);
          fallbackGroup.add(wheel);
        });

        modelGroupRef.current = fallbackGroup;
        scene.add(fallbackGroup);

        const box = new THREE.Box3().setFromObject(fallbackGroup);
        const size = box.getSize(new THREE.Vector3());
        camera.position.set(6, 4, 7);
        controls.target.set(0, size.y * 0.5, 0);
        controls.update();

        renderHotspots();
        setLoading(false);
      }
    );

    // 7. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoRotate;
        controlsRef.current.autoRotateSpeed = 1.5;
        controlsRef.current.update();
      }

      // Animate hotspot markers (pulsing scale & floating)
      if (hotspotsGroupRef.current) {
        const time = Date.now() * 0.003;
        hotspotsGroupRef.current.children.forEach((hotspotMesh, idx) => {
          hotspotMesh.position.y += Math.sin(time + idx) * 0.0015;
        });
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Resize Handler with ResizeObserver
    const updateSize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth || 300;
      const h = containerRef.current.clientHeight || 200;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h, false);
    };

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Trigger initial resize after tick
    const resizeTimer = setTimeout(updateSize, 50);
    window.addEventListener('resize', updateSize);

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', updateSize);
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, [modelUrl]);

  // Render Sensor Hotspot Markers in 3D Space
  const renderHotspots = () => {
    if (!hotspotsGroupRef.current) return;
    hotspotsGroupRef.current.clear();

    if (!interactiveHotspots) return;

    SENSOR_HOTSPOTS.forEach((sensor) => {
      const isSelected = selectedSensorId === sensor.id;
      
      // Marker Sphere
      const geometry = new THREE.SphereGeometry(isSelected ? 0.22 : 0.16, 16, 16);
      const material = new THREE.MeshStandardMaterial({
        color: isSelected ? 0xf59e0b : 0x38bdf8, // Amber if selected, Cyan if default
        emissive: isSelected ? 0xd97706 : 0x0284c7,
        emissiveIntensity: 0.8,
        metalness: 0.2,
        roughness: 0.1
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...sensor.position);
      mesh.userData = { sensorId: sensor.id };

      // Add Pulsing Outer Ring
      const ringGeo = new THREE.RingGeometry(0.24, 0.32, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0xfbbf24 : 0x00f0ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      mesh.add(ringMesh);

      hotspotsGroupRef.current?.add(mesh);
    });
  };

  // Handle Explosion Factor Updates
  useEffect(() => {
    if (!modelGroupRef.current) return;
    const model = modelGroupRef.current;

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const origPos = originalPositionsRef.current.get(child);
        if (origPos) {
          // Calculate explosion vector directed away from origin
          const dir = origPos.clone().normalize();
          if (dir.length() === 0) dir.set(0, 1, 0);

          const factor = explosionFactor * 2.5; // Scale explosion distance
          child.position.set(
            origPos.x + dir.x * factor,
            origPos.y + dir.y * factor,
            origPos.z + dir.z * factor
          );
        }
      }
    });

    // Also offset hotspots in exploded mode
    if (hotspotsGroupRef.current) {
      hotspotsGroupRef.current.children.forEach((mesh) => {
        const sensorId = mesh.userData.sensorId;
        const sensor = SENSOR_HOTSPOTS.find(s => s.id === sensorId);
        if (sensor) {
          const origPos = new THREE.Vector3(...sensor.position);
          const dir = origPos.clone().normalize();
          const factor = explosionFactor * 2.5;
          mesh.position.set(
            origPos.x + dir.x * factor,
            origPos.y + dir.y * factor,
            origPos.z + dir.z * factor
          );
        }
      });
    }
  }, [explosionFactor]);

  // Update Bus Heading Angle
  useEffect(() => {
    if (modelGroupRef.current) {
      // Convert heading degrees to radians
      modelGroupRef.current.rotation.y = -(busHeading * Math.PI) / 180;
    }
  }, [busHeading]);

  // Re-render hotspots when selected sensor changes
  useEffect(() => {
    renderHotspots();

    // Move camera to focus on selected sensor
    if (selectedSensorId && cameraRef.current && controlsRef.current) {
      const sensor = SENSOR_HOTSPOTS.find((s) => s.id === selectedSensorId);
      if (sensor) {
        const targetPos = new THREE.Vector3(...sensor.position);
        const factor = explosionFactor * 2.5;
        const dir = targetPos.clone().normalize();
        const actualPos = targetPos.add(dir.multiplyScalar(factor));

        const cameraOffset = new THREE.Vector3(actualPos.x + 3, actualPos.y + 1.5, actualPos.z + 4);
        
        // Smooth transition target
        controlsRef.current.target.copy(actualPos);
        cameraRef.current.position.copy(cameraOffset);
        controlsRef.current.update();
      }
    }
  }, [selectedSensorId]);

  // Click Raycaster for 3D Sensor Hotspots
  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!interactiveHotspots || !cameraRef.current || !hotspotsGroupRef.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const intersects = raycaster.intersectObjects(hotspotsGroupRef.current.children, true);

    if (intersects.length > 0) {
      let object: THREE.Object3D | null = intersects[0].object;
      while (object && !object.userData.sensorId && object.parent) {
        object = object.parent;
      }
      if (object && object.userData.sensorId) {
        const sensor = SENSOR_HOTSPOTS.find((s) => s.id === object!.userData.sensorId);
        if (sensor && onSelectSensor) {
          onSelectSensor(sensor);
        }
      }
    }
  };

  return (
    <div className={`relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 ${className}`}>
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur flex flex-col items-center justify-center p-4">
          <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs font-semibold text-slate-300">Loading Bharat Bus 3D GLB Model...</p>
          <p className="text-[10px] text-slate-500 mt-1">Preparing WebGL & Sensor Geometry</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute inset-0 z-20 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center">
          <div className="text-amber-500 text-3xl mb-2">⚠️</div>
          <h4 className="text-sm font-semibold text-slate-200">3D Asset Loading Notice</h4>
          <p className="text-xs text-slate-400 max-w-sm mt-1">{error}</p>
        </div>
      )}

      {/* WebGL Canvas Container */}
      <div
        ref={containerRef}
        onClick={handleCanvasClick}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Overlay Instructions & Controls Helper */}
      <div className="absolute bottom-3 left-3 z-10 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping inline-block"></span>
        <span>Drag to rotate • Scroll to zoom • Click sensor nodes</span>
      </div>
    </div>
  );
};
