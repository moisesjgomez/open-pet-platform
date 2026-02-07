// lib/location.ts
// Location service with browser geolocation and localStorage caching

export interface UserLocation {
  latitude: number;
  longitude: number;
  zipCode?: string;
  city?: string;
  state?: string;
  timestamp: number;
}

const LOCATION_CACHE_KEY = 'open_pet_user_location';
const LOCATION_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Get cached location from localStorage
 */
export function getCachedLocation(): UserLocation | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(LOCATION_CACHE_KEY);
    if (!cached) return null;
    
    const location: UserLocation = JSON.parse(cached);
    
    // Check if cache is still valid
    if (Date.now() - location.timestamp > LOCATION_CACHE_DURATION) {
      localStorage.removeItem(LOCATION_CACHE_KEY);
      return null;
    }
    
    return location;
  } catch {
    return null;
  }
}

/**
 * Save location to localStorage cache
 */
export function cacheLocation(location: UserLocation): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(location));
  } catch (error) {
    console.warn('Failed to cache location:', error);
  }
}

/**
 * Clear cached location
 */
export function clearCachedLocation(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOCATION_CACHE_KEY);
}

/**
 * Get current position using browser geolocation
 */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000, // 5 minutes
    });
  });
}

/**
 * Reverse geocode coordinates to get city/state/zip
 * Uses a free geocoding API (BigDataCloud)
 */
export async function reverseGeocode(lat: number, lon: number): Promise<{
  city?: string;
  state?: string;
  zipCode?: string;
}> {
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    
    if (!response.ok) {
      throw new Error('Geocoding failed');
    }
    
    const data = await response.json();
    
    return {
      city: data.city || data.locality,
      state: data.principalSubdivisionCode?.replace('US-', ''),
      zipCode: data.postcode,
    };
  } catch (error) {
    console.warn('Reverse geocoding failed:', error);
    return {};
  }
}

/**
 * Get user location - tries cache first, then browser geolocation
 */
export async function getUserLocation(forceRefresh = false): Promise<UserLocation | null> {
  // Check cache first (unless forcing refresh)
  if (!forceRefresh) {
    const cached = getCachedLocation();
    if (cached) return cached;
  }

  try {
    const position = await getCurrentPosition();
    const { latitude, longitude } = position.coords;
    
    // Reverse geocode to get ZIP code (Petfinder prefers ZIP)
    const geoData = await reverseGeocode(latitude, longitude);
    
    const location: UserLocation = {
      latitude,
      longitude,
      zipCode: geoData.zipCode,
      city: geoData.city,
      state: geoData.state,
      timestamp: Date.now(),
    };
    
    // Cache the location
    cacheLocation(location);
    
    return location;
  } catch (error) {
    console.error('Failed to get user location:', error);
    return null;
  }
}

/**
 * Get location string for Petfinder API
 * Prefers ZIP code, falls back to "City, State" or coordinates
 */
export function getLocationString(location: UserLocation): string {
  if (location.zipCode) {
    return location.zipCode;
  }
  if (location.city && location.state) {
    return `${location.city}, ${location.state}`;
  }
  return `${location.latitude},${location.longitude}`;
}

/**
 * Create a location from a ZIP code
 */
export function createLocationFromZip(zipCode: string): UserLocation {
  return {
    latitude: 0,
    longitude: 0,
    zipCode,
    timestamp: Date.now(),
  };
}

/**
 * Check if geolocation is supported
 */
export function isGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}
