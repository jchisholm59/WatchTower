import React, { useEffect, useState } from 'react';
import { Target, ShieldCheck, X, Plus } from 'lucide-react';
import { NotificationSettings, ExclusionZone } from '../types';
import { ExclusionZoneModal } from './ExclusionZoneModal';

interface ZonesStudioViewProps {
  settings: NotificationSettings;
  onUpdateSettings: (newSettings: NotificationSettings) => void;
  availableCameras?: { id: string; name: string; liveImageUrl?: string }[];
}

export const ZonesStudioView: React.FC<ZonesStudioViewProps> = ({
  settings,
  onUpdateSettings,
  availableCameras = [],
}) => {
  const [localSettings, setLocalSettings] = useState<NotificationSettings>(settings);

  // Sync with prop when changed externally
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const updateFilters = (partial: Partial<NotificationSettings['filters']>) => {
    const updated = {
      ...localSettings,
      filters: { ...localSettings.filters, ...partial },
    };
    setLocalSettings(updated);
    onUpdateSettings(updated);
  };

  const [exclusionModalCameraId, setExclusionModalCameraId] = useState<string | null>(null);
  const handleSaveExclusionZones = (cameraId: string, zones: ExclusionZone[]) => {
    updateFilters({
      exclusionZones: { ...(localSettings.filters.exclusionZones || {}), [cameraId]: zones },
    });
  };

  // Known Vehicles — identity-based suppression via Frigate+ sub-label
  // classifiers, as an alternative to exclusionZones for the specific case
  // of "this is my own vehicle": a spatial zone can't tell a recognized
  // vehicle apart from an unrecognized one parked in the same spot, so it
  // has to blind the camera to that whole area either way.
  const [expandedKnownVehiclesCameraId, setExpandedKnownVehiclesCameraId] = useState<string | null>(null);
  const [newVehicleNameInput, setNewVehicleNameInput] = useState('');

  const handleAddKnownVehicle = (cameraId: string) => {
    const name = newVehicleNameInput.trim();
    if (!name) return;
    const existing = localSettings.filters.knownVehicles?.[cameraId] || [];
    if (existing.includes(name)) {
      setNewVehicleNameInput('');
      return;
    }
    updateFilters({
      knownVehicles: { ...(localSettings.filters.knownVehicles || {}), [cameraId]: [...existing, name] },
    });
    setNewVehicleNameInput('');
  };

  const handleRemoveKnownVehicle = (cameraId: string, name: string) => {
    const existing = localSettings.filters.knownVehicles?.[cameraId] || [];
    updateFilters({
      knownVehicles: { ...(localSettings.filters.knownVehicles || {}), [cameraId]: existing.filter((n) => n !== name) },
    });
  };

  if (availableCameras.length === 0) {
    return (
      <div className="py-24 flex flex-col items-center justify-center bg-slate-900/40 rounded-[2.5rem] border border-dashed border-slate-800 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-full bg-slate-950 flex items-center justify-center border border-slate-800 mb-6 shadow-inner">
          <Target className="w-10 h-10 text-slate-700" />
        </div>
        <h3 className="text-white font-black uppercase tracking-[0.2em] text-sm">No Cameras Available</h3>
        <p className="text-slate-600 text-[10px] mt-2 max-w-[280px] uppercase font-bold tracking-widest leading-relaxed">
          Connect a Frigate server with at least one camera to configure exclusion zones and known vehicles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-2.5">
        <Target className="w-5 h-5 text-red-400" />
        <h2 className="text-lg font-black uppercase tracking-tight text-white">Zones Studio</h2>
      </div>
      <p className="text-xs text-slate-500 max-w-2xl">
        Two independent ways to stop a known, uninteresting detection from alerting you — by where it is in the
        frame, or by what Frigate recognizes it as. They can be used together.
      </p>

      {/* Exclusion Zones */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-red-400" />
          Exclusion Zones
        </label>
        <div className="space-y-1.5">
          {availableCameras.map((cam) => {
            const zoneCount = localSettings.filters.exclusionZones?.[cam.id]?.length || 0;
            return (
              <button
                key={cam.id}
                type="button"
                onClick={() => setExclusionModalCameraId(cam.id)}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition-all"
              >
                <span className="text-xs font-bold text-white">{cam.name}</span>
                <span
                  className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-lg ${
                    zoneCount > 0 ? 'bg-red-950/40 text-red-300 border border-red-500/30' : 'text-slate-500'
                  }`}
                >
                  {zoneCount > 0 ? `${zoneCount} zone${zoneCount > 1 ? 's' : ''}` : 'None — click to add'}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">
          Detections centered inside an excluded area are skipped before any alert is sent — independent of
          Frigate's own "stationary" detection, which is often unreliable for parked cars under changing light or
          shadow. Because this suppresses by location, an unrecognized vehicle parked in the same spot is also
          missed — see Known Vehicles below for an identity-based alternative.
        </p>
      </div>

      {/* Known Vehicles */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Known Vehicles
        </label>
        <div className="space-y-1.5">
          {availableCameras.map((cam) => {
            const vehicles = localSettings.filters.knownVehicles?.[cam.id] || [];
            const isExpanded = expandedKnownVehiclesCameraId === cam.id;
            return (
              <div key={cam.id} className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setExpandedKnownVehiclesCameraId(isExpanded ? null : cam.id);
                    setNewVehicleNameInput('');
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2 hover:border-slate-700 text-left transition-all"
                >
                  <span className="text-xs font-bold text-white">{cam.name}</span>
                  <span
                    className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-lg ${
                      vehicles.length > 0 ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30' : 'text-slate-500'
                    }`}
                  >
                    {vehicles.length > 0 ? `${vehicles.length} recognized` : 'None — click to add'}
                  </span>
                </button>
                {isExpanded && (
                  <div className="px-3.5 pb-3.5 space-y-2.5 border-t border-slate-800 pt-3">
                    {vehicles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {vehicles.map((name) => (
                          <span
                            key={name}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold uppercase tracking-wider"
                          >
                            {name}
                            <button
                              type="button"
                              onClick={() => handleRemoveKnownVehicle(cam.id, name)}
                              className="text-emerald-400 hover:text-white"
                              title={`Stop recognizing "${name}"`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newVehicleNameInput}
                        onChange={(e) => setNewVehicleNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddKnownVehicle(cam.id);
                          }
                        }}
                        placeholder="Sub-label name, e.g. Tundra"
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddKnownVehicle(cam.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold uppercase tracking-wider transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Add
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Must exactly match a Frigate+ sub-label classifier name configured for this camera
                      (case-sensitive).
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">
          A "car" detection Frigate identifies as one of these (via a Frigate+ sub-label classifier) is skipped
          regardless of where in the frame it is — unlike Exclusion Zones, this doesn't blind the camera to an
          unrecognized vehicle parked in the same spot.
        </p>
      </div>

      <ExclusionZoneModal
        isOpen={exclusionModalCameraId !== null}
        onClose={() => setExclusionModalCameraId(null)}
        cameras={availableCameras}
        initialCameraId={exclusionModalCameraId || undefined}
        exclusionZones={localSettings.filters.exclusionZones || {}}
        onSave={handleSaveExclusionZones}
      />
    </div>
  );
};
