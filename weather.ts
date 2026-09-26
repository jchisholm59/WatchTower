/**
 * Weather service — Open-Meteo integration (current conditions + 7-day
 * forecast). Free, no API key, takes lat/lon directly.
 *
 * Exposes:
 *   GET /api/weather/current?loc=<location id>  — forecast for one saved location
 *                                                 (defaults to the first)
 *   GET /api/weather/search?q=<place name>      — place lookup (Open-Meteo geocoding)
 *
 * Locations are saved in settings.weather.locations. Older settings that only
 * have homeLat/homeLon are treated as a single location called "Home".
 *
 * Kept out of server.ts so the feature is self-contained, mirroring
 * tides.ts / flights.ts. No background scheduler — nothing needs to run
 * when the tab isn't open.
 */

import type { Express, Request, Response } from 'express';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const CACHE_TTL = 10 * 60 * 1000; // 10min — be polite to a free public API
const GEO_CACHE_TTL = 60 * 60 * 1000; // place names don't change

export interface WeatherServiceDeps {
  /** Returns the full persistent settings object (holds `.weather`). */
  getSettings: () => any;
}

export interface WeatherLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

/** Saved locations, falling back to the legacy single home lat/lon. */
export function getWeatherLocations(cfg: any): WeatherLocation[] {
  const list = Array.isArray(cfg?.locations) ? cfg.locations : [];
  const valid = list.filter(
    (l: any) => l && typeof l.id === 'string' && Number.isFinite(Number(l.latitude)) && Number.isFinite(Number(l.longitude)),
  );
  if (valid.length > 0) {
    return valid.map((l: any) => ({
      id: l.id,
      name: String(l.name || 'Location'),
      latitude: Number(l.latitude),
      longitude: Number(l.longitude),
    }));
  }
  const lat = Number(cfg?.homeLat);
  const lon = Number(cfg?.homeLon);
  if (lat && lon) return [{ id: 'home', name: 'Home', latitude: lat, longitude: lon }];
  return [];
}

interface CacheEntry<T> {
  value: T;
  ts: number;
}

export function createWeatherService(deps: WeatherServiceDeps) {
  const cache = new Map<string, CacheEntry<any>>();

  async function fetchForecast(lat: number, lon: number) {
    const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.value;

    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,is_day',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset',
      temperature_unit: 'celsius',
      wind_speed_unit: 'kmh',
      precipitation_unit: 'mm',
      timezone: 'auto',
      forecast_days: '7',
    });

    const resp = await fetch(`${FORECAST_URL}?${params.toString()}`);
    if (!resp.ok) throw new Error(`Open-Meteo HTTP ${resp.status}`);
    const raw = await resp.json();

    const daily = (raw.daily?.time || []).map((date: string, i: number) => ({
      date,
      weatherCode: raw.daily.weather_code[i],
      highC: raw.daily.temperature_2m_max[i],
      lowC: raw.daily.temperature_2m_min[i],
      precipProbabilityPct: raw.daily.precipitation_probability_max[i],
      windSpeedMaxKmh: raw.daily.wind_speed_10m_max[i],
      sunrise: raw.daily.sunrise[i],
      sunset: raw.daily.sunset[i],
    }));

    const readout = {
      success: true,
      current: {
        time: raw.current.time,
        temperatureC: raw.current.temperature_2m,
        apparentTemperatureC: raw.current.apparent_temperature,
        humidityPct: raw.current.relative_humidity_2m,
        precipitationMm: raw.current.precipitation,
        weatherCode: raw.current.weather_code,
        windSpeedKmh: raw.current.wind_speed_10m,
        windDirectionDeg: raw.current.wind_direction_10m,
        pressureHpa: raw.current.surface_pressure,
        isDay: raw.current.is_day === 1,
      },
      daily,
      timezone: raw.timezone,
      fetchedAt: Date.now(),
    };

    cache.set(cacheKey, { value: readout, ts: Date.now() });
    return readout;
  }

  return {
    registerRoutes(app: Express) {
      app.get('/api/weather/current', async (req: Request, res: Response) => {
        const settings = deps.getSettings() || {};
        const locations = getWeatherLocations(settings.weather);
        if (locations.length === 0) {
          return res.status(400).json({ success: false, error: 'No weather location configured' });
        }
        // Only saved locations are accepted (by id), so this can't be used as an open forecast proxy.
        const wanted = String(req.query.loc || '');
        const loc = locations.find((l) => l.id === wanted) || locations[0];
        try {
          const readout = await fetchForecast(loc.latitude, loc.longitude);
          res.json({ ...readout, location: { id: loc.id, name: loc.name } });
        } catch (e: any) {
          res.status(502).json({ success: false, error: e.message || 'Weather fetch failed' });
        }
      });

      // Type-ahead place lookup for the settings screen.
      app.get('/api/weather/search', async (req: Request, res: Response) => {
        const q = String(req.query.q || '').trim();
        if (q.length < 2) return res.json({ success: true, results: [] });
        const cacheKey = `geo:${q.toLowerCase()}`;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.ts < GEO_CACHE_TTL) return res.json(cached.value);
        try {
          const params = new URLSearchParams({ name: q, count: '15', language: 'en', format: 'json' });
          const resp = await fetch(`${GEOCODE_URL}?${params.toString()}`);
          if (!resp.ok) throw new Error(`Open-Meteo geocoding HTTP ${resp.status}`);
          const raw = await resp.json();
          // Canadian places first (stable sort keeps Open-Meteo's own ranking within each group),
          // so "Merigo" finds Merigomish before villages in France.
          const ranked = [...(raw.results || [])].sort(
            (a: any, b: any) => Number(b.country_code === 'CA') - Number(a.country_code === 'CA'),
          );
          const results = ranked.slice(0, 8).map((r: any) => ({
            id: String(r.id),
            name: r.name,
            region: r.admin1 || '',
            country: r.country || '',
            countryCode: r.country_code || '',
            latitude: r.latitude,
            longitude: r.longitude,
          }));
          const value = { success: true, results };
          cache.set(cacheKey, { value, ts: Date.now() });
          res.json(value);
        } catch (e: any) {
          res.status(502).json({ success: false, error: e.message || 'Location search failed' });
        }
      });
    },
  };
}
