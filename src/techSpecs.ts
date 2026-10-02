import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
// Versions come straight from each installed package's own package.json, so
// they're exact and can't drift out of date like hand-typed strings would.
import asyncStoragePkg from '@react-native-async-storage/async-storage/package.json';
import vectorIconsPkg from '@expo/vector-icons/package.json';
import expoPkg from 'expo/package.json';
import expoAudioPkg from 'expo-audio/package.json';
import expoLinearGradientPkg from 'expo-linear-gradient/package.json';
import reactPkg from 'react/package.json';
import reactNativePkg from 'react-native/package.json';
import reactNativeWebPkg from 'react-native-web/package.json';
import typescriptPkg from 'typescript/package.json';

export interface SpecRowData {
  label: string;
  value: string;
}

export function softwareRows(): SpecRowData[] {
  return [
    { label: 'App', value: `${Constants.expoConfig?.name ?? 'Dolly Pocket'} ${Constants.expoConfig?.version ?? ''}`.trim() },
    { label: 'Expo SDK', value: expoPkg.version },
    { label: 'React Native', value: reactNativePkg.version },
    { label: 'React', value: reactPkg.version },
    { label: 'react-native-web', value: reactNativeWebPkg.version },
    { label: 'TypeScript', value: typescriptPkg.version },
    { label: 'expo-audio', value: expoAudioPkg.version },
    { label: 'expo-linear-gradient', value: expoLinearGradientPkg.version },
    { label: '@expo/vector-icons', value: vectorIconsPkg.version },
    { label: 'async-storage', value: asyncStoragePkg.version },
  ];
}

const GB = 1024 ** 3;

// What this device (the one running the app right now — phone, laptop, or the
// Pi's own browser) reports about itself.
export function deviceRows(): SpecRowData[] {
  if (Platform.OS === 'web') {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const ua = navigator.userAgent;
    const browser =
      ua.match(/(Edg|Firefox)\/([\d.]+)/) ?? ua.match(/(Chrome)\/([\d.]+)/) ?? ua.match(/(Version)\/([\d.]+)/);
    const name = browser ? (browser[1] === 'Version' ? 'Safari' : browser[1] === 'Edg' ? 'Edge' : browser[1]) : 'Unknown';
    return [
      { label: 'Browser', value: browser ? `${name} ${browser[2]}` : 'Unknown' },
      { label: 'Platform', value: navigator.platform || 'Unknown' },
      { label: 'CPU cores', value: String(navigator.hardwareConcurrency ?? 'Unknown') },
      // Browsers cap and round this on purpose (privacy), topping out at 8.
      { label: 'Memory', value: nav.deviceMemory ? `${nav.deviceMemory} GB (approx.)` : 'Not reported' },
      { label: 'Screen', value: `${screen.width}×${screen.height} @ ${window.devicePixelRatio}x` },
    ];
  }

  return [
    { label: 'Device', value: [Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || 'Unknown' },
    { label: 'OS', value: [Device.osName, Device.osVersion].filter(Boolean).join(' ') || 'Unknown' },
    { label: 'CPU', value: Device.supportedCpuArchitectures?.join(', ') ?? 'Unknown' },
    { label: 'Memory', value: Device.totalMemory ? `${(Device.totalMemory / GB).toFixed(1)} GB` : 'Unknown' },
  ];
}

// The physical kiosk build. A browser can't see any of this (it only knows
// about the screen it's drawing to), so it's documented here once — update it
// if the build changes. Versions are as observed on the running Pi.
export const KIOSK_HARDWARE: SpecRowData[] = [
  { label: 'Board', value: 'Raspberry Pi 5, 8 GB' },
  { label: 'Storage', value: 'NVMe SSD on a Pimoroni NVMe Base' },
  { label: 'Display', value: 'Waveshare 3.2" HDMI LCD (H), 480×800, run landscape' },
  { label: 'Video out', value: 'micro-HDMI → HDMI adapter' },
  { label: 'Case', value: 'Polly Pocket compact' },
];

export const KIOSK_SOFTWARE: SpecRowData[] = [
  { label: 'OS', value: 'Raspberry Pi OS, Debian 13 "Trixie" (64-bit)' },
  { label: 'Kernel', value: '6.18.39+rpt-rpi-2712' },
  { label: 'Node.js', value: '20.19.2' },
  { label: 'Chromium', value: '152.0.7977.82' },
  { label: 'Compositor', value: 'cage (Wayland kiosk)' },
];
