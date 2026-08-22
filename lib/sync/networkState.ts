import * as Network from 'expo-network';
import { useEffect, useState } from 'react';

let _isOnline = true;
const _listeners = new Set<(online: boolean) => void>();

export function getIsOnline() {
  return _isOnline;
}

export function onNetworkChange(cb: (online: boolean) => void): () => void {
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
}

function _notify(online: boolean) {
  if (_isOnline === online) return;
  _isOnline = online;
  _listeners.forEach((cb) => cb(online));
}

export async function initNetworkMonitor() {
  const state = await Network.getNetworkStateAsync();
  _isOnline = !!(state.isConnected && state.isInternetReachable);
  // Poll every 10s — expo-network has no event subscription on all platforms
  setInterval(async () => {
    const s = await Network.getNetworkStateAsync();
    _notify(!!(s.isConnected && s.isInternetReachable));
  }, 10_000);
}

export function useNetwork() {
  const [isOnline, setIsOnline] = useState(_isOnline);
  useEffect(() => { return onNetworkChange(setIsOnline); }, []);
  return isOnline;
}
