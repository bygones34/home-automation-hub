import React from 'react';
import type { DeviceState } from '../types/device';
import {
  Sofa,
  Bed,
  Utensils,
  Bath,
  Sun,
  Briefcase,
  DoorOpen,
  Home,
} from 'lucide-react';

export interface RoomDefinition {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badgeClass: string;
}

export const ROOM_CATALOG: RoomDefinition[] = [
  {
    id: 'living-room',
    name: 'Salon',
    icon: Sofa,
    color: 'text-amber-400',
    badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  },
  {
    id: 'bedroom',
    name: 'Yatak Odası',
    icon: Bed,
    color: 'text-purple-400',
    badgeClass: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  },
  {
    id: 'kitchen',
    name: 'Mutfak',
    icon: Utensils,
    color: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  },
  {
    id: 'bathroom',
    name: 'Banyo',
    icon: Bath,
    color: 'text-sky-400',
    badgeClass: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  },
  {
    id: 'office',
    name: 'Çalışma Odası',
    icon: Briefcase,
    color: 'text-indigo-400',
    badgeClass: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
  },
  {
    id: 'balcony',
    name: 'Balkon',
    icon: Sun,
    color: 'text-orange-400',
    badgeClass: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
  },
  {
    id: 'hallway',
    name: 'Koridor',
    icon: DoorOpen,
    color: 'text-rose-400',
    badgeClass: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  },
  {
    id: 'other',
    name: 'Diğer',
    icon: Home,
    color: 'text-slate-400',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700/60',
  },
];

/**
 * Cihazın odasını belirler:
 * 1. Kullanıcı tarafından atanmış override (localStorage)
 * 2. Cihazın telemetry.room veya telemetry.zone değeri
 * 3. Cihaz ID ve Type'ına göre akıllı çıkarım (heuristic)
 */
export function resolveDeviceRoom(
  device: DeviceState,
  userOverrides: Record<string, string> = {}
): string {
  if (userOverrides[device.deviceId]) {
    return userOverrides[device.deviceId];
  }

  const rawRoom =
    device.room ||
    (device.telemetry as any)?.room ||
    (device.telemetry as any)?.zone;

  if (rawRoom && typeof rawRoom === 'string' && rawRoom.trim()) {
    return rawRoom.trim();
  }

  const id = (device.deviceId || '').toLowerCase();
  const type = (device.deviceType || '').toLowerCase();

  if (id.includes('living') || id.includes('salon') || type.includes('living')) {
    return 'Salon';
  }
  if (id.includes('bed') || id.includes('yatak') || type.includes('bed')) {
    return 'Yatak Odası';
  }
  if (id.includes('kitchen') || id.includes('mutfak') || type.includes('kitchen')) {
    return 'Mutfak';
  }
  if (id.includes('bath') || id.includes('banyo') || type.includes('bath')) {
    return 'Banyo';
  }
  if (id.includes('office') || id.includes('calisma') || id.includes('study')) {
    return 'Çalışma Odası';
  }
  if (id.includes('balcony') || id.includes('balkon')) {
    return 'Balkon';
  }
  if (id.includes('hall') || id.includes('corridor') || id.includes('koridor')) {
    return 'Koridor';
  }

  return 'Diğer';
}

export function getRoomConfig(roomName: string): RoomDefinition {
  const match = ROOM_CATALOG.find(
    (r) =>
      r.name.toLowerCase() === roomName.toLowerCase() ||
      r.id.toLowerCase() === roomName.toLowerCase()
  );
  if (match) return match;

  return {
    id: roomName.toLowerCase().replace(/\s+/g, '-'),
    name: roomName,
    icon: Home,
    color: 'text-slate-400',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700/60',
  };
}
