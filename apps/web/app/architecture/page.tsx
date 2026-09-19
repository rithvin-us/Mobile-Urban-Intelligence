'use client';

import React, { useState } from 'react';
import { BusModelViewer, SENSOR_HOTSPOTS, SensorHotspot } from '@/components/3d/bus_model_viewer';
import { Cpu, Camera, Radio, Wifi, ShieldAlert, Layers, Sliders, Info, Zap, ChevronRight, Activity, Terminal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function ArchitecturePage() {
  const [explosionFactor, setExplosionFactor] = useState<number>(0.3); // Default 30% explosion
  const [selectedSensor, setSelectedSensor] = useState<SensorHotspot | null>(SENSOR_HOTSPOTS[0]);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
              3D Digital Twin & Hardware Spec
            </Badge>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              NVIDIA Jetson Architecture
            </Badge>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-2">
            Bharat Bus Hardware & Sensor Mounting Exploded View
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Interactive 3D model breakdown of sensor mounting positions, edge compute modules, GNSS antennas, and real-time telemetry hardware powering the SIH26124 Urban Intelligence Platform.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setExplosionFactor(prev => (prev === 0 ? 0.5 : 0))}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition shadow-lg shadow-blue-900/30"
          >
            <Layers className="h-4 w-4" />
            <span>{explosionFactor > 0 ? 'Collapse View' : 'Explode 3D View'}</span>
          </button>
        </div>
      </div>

      {/* Main 3D Viewport & Sensor Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 3D Canvas Container */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          <Card className="flex-1 bg-slate-950 border-slate-800 overflow-hidden flex flex-col min-h-[480px]">
            <CardHeader className="py-3 px-4 border-b border-slate-800/80 bg-slate-900/50 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-400" />
                <span>Interactive 3D Canvas (bharat-bus-av.glb)</span>
              </CardTitle>

              {/* Exploded Slider Controls */}
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Sliders className="h-3.5 w-3.5 text-slate-400" />
                  <span>Explosion Factor:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={explosionFactor}
                    onChange={(e) => setExplosionFactor(parseFloat(e.target.value))}
                    className="w-24 accent-blue-500 bg-slate-800 cursor-pointer"
                  />
                  <span className="font-mono text-blue-400 text-[11px] w-8">{Math.round(explosionFactor * 100)}%</span>
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={autoRotate}
                    onChange={(e) => setAutoRotate(e.target.checked)}
                    className="rounded accent-blue-500"
                  />
                  <span>Auto-Rotate</span>
                </label>
              </div>
            </CardHeader>

            <CardContent className="flex-1 p-0 relative min-h-[440px]">
              <BusModelViewer
                modelUrl="/bharat-bus-av.glb"
                explosionFactor={explosionFactor}
                selectedSensorId={selectedSensor?.id || null}
                onSelectSensor={(sensor) => setSelectedSensor(sensor)}
                autoRotate={autoRotate}
                interactiveHotspots={true}
                className="w-full h-full min-h-[440px]"
              />
            </CardContent>
          </Card>

          {/* Quick Sensor Focus Selector Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {SENSOR_HOTSPOTS.map((sensor) => {
              const isSelected = selectedSensor?.id === sensor.id;
              return (
                <button
                  key={sensor.id}
                  onClick={() => setSelectedSensor(sensor)}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className="text-[10px] uppercase font-mono text-slate-400">{sensor.category}</div>
                  <div className="text-xs font-semibold truncate mt-1">{sensor.name}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sensor Detail & Hardware Spec Side Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader className="py-4 border-b border-slate-800 bg-slate-950/40">
              <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span>Hardware Mounting Specification</span>
                </span>
                {selectedSensor && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]">
                    {selectedSensor.category.toUpperCase()}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {selectedSensor ? (
                <>
                  <div>
                    <h3 className="text-base font-bold text-white">{selectedSensor.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {selectedSensor.description}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">Hardware Interface Specs</div>
                    <div className="font-mono text-emerald-400 text-xs leading-relaxed">
                      {selectedSensor.hardwareSpec}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-300">Mounting Coordinates (3D Spatial Offset)</div>
                    <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                      <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">X (Lateral)</span>
                        <span className="text-blue-400">{selectedSensor.position[0]}m</span>
                      </div>
                      <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Y (Height)</span>
                        <span className="text-emerald-400">{selectedSensor.position[1]}m</span>
                      </div>
                      <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Z (Longitudinal)</span>
                        <span className="text-amber-400">{selectedSensor.position[2]}m</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Select a sensor hotspot from the 3D model to inspect mounting specifications.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actual System Implementation Architecture */}
          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader className="py-4 border-b border-slate-800 bg-slate-950/40">
              <CardTitle className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Terminal className="h-4 w-4 text-blue-400" />
                <span>Actual Project Data Flow</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs space-y-3 text-slate-300">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div>
                <div>
                  <strong className="text-slate-100">Camera & GPS Input</strong>: Front optical camera captures road frames at 60 FPS while NMEA GPS streams latitude, longitude, and speed.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</div>
                <div>
                  <strong className="text-slate-100">Jetson Edge Inference</strong>: YOLOv8 TensorRT engine detects potholes & road hazards. ByteTrack prevents double-counting across consecutive frames.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-amber-600/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</div>
                <div>
                  <strong className="text-slate-100">Central REST / PostGIS Sync</strong>: High-confidence defect events & GPS telemetry are posted via 5G/LTE to FastAPI backend & PostGIS spatial database.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
