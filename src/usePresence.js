import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPresencePhase, PRESENCE_PHASES } from "./EnvironmentEffects";

export const WEATHER_TYPES = {
  clear: { key: "clear", label: "CLEAR" },
  cloudy: { key: "cloudy", label: "CLOUDY" },
  rain: { key: "rain", label: "RAIN" },
  mist: { key: "mist", label: "MIST" },
  wind: { key: "wind", label: "WIND" },
};

const VALID_PHASES = new Set(["auto", "dawn", "day", "dusk", "night"]);
const VALID_WEATHER = new Set([
  "auto",
  "clear",
  "cloudy",
  "rain",
  "mist",
  "wind",
]);

function initialParam(name, validValues, fallback) {
  if (typeof window === "undefined") return fallback;
  const value = new URLSearchParams(window.location.search).get(name);
  return value && validValues.has(value) ? value : fallback;
}

function weatherFromCurrent(current = {}) {
  const code = Number(current.weather_code ?? 0);
  const precipitation = Number(current.precipitation ?? 0);
  const wind = Number(current.wind_speed_10m ?? 0);
  const cloud = Number(current.cloud_cover ?? 0);

  if (code === 45 || code === 48) return WEATHER_TYPES.mist;
  if (
    precipitation > 0.05 ||
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 99)
  ) {
    return WEATHER_TYPES.rain;
  }
  if (wind >= 28) return WEATHER_TYPES.wind;
  if (cloud >= 68 || (code >= 1 && code <= 3)) return WEATHER_TYPES.cloudy;
  return WEATHER_TYPES.clear;
}

export function getPresenceMood(phase, weather) {
  if (weather.key === "rain") return { key: "quiet", label: "QUIET" };
  if (weather.key === "mist") return { key: "dreamy", label: "DREAMY" };
  if (weather.key === "wind") return { key: "curious", label: "CURIOUS" };
  if (phase.key === "night") return { key: "sleepy", label: "SLEEPY" };
  if (phase.key === "dusk") return { key: "cozy", label: "COZY" };
  if (weather.key === "cloudy") return { key: "soft", label: "SOFT" };
  return { key: "bright", label: "BRIGHT" };
}

export default function usePresence() {
  const [clockPhase, setClockPhase] = useState(() => getPresencePhase(new Date()));
  const [phaseMode, setPhaseMode] = useState(() =>
    initialParam("phase", VALID_PHASES, "auto"),
  );
  const [weatherMode, setWeatherMode] = useState(() =>
    initialParam("weather", VALID_WEATHER, "auto"),
  );
  const [localWeather, setLocalWeather] = useState(null);
  const [weatherInfo, setWeatherInfo] = useState(null);
  const [weatherStatus, setWeatherStatus] = useState("idle");
  const coordsRef = useRef(null);

  useEffect(() => {
    const update = () => setClockPhase(getPresencePhase(new Date()));
    const timer = window.setInterval(update, 60_000);
    window.addEventListener("focus", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, []);

  const fetchWeather = useCallback(async (latitude, longitude) => {
    setWeatherStatus("loading");
    try {
      const params = new URLSearchParams({
        latitude: latitude.toFixed(4),
        longitude: longitude.toFixed(4),
        current:
          "temperature_2m,weather_code,precipitation,cloud_cover,wind_speed_10m",
        timezone: "auto",
      });
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
      );
      if (!response.ok) throw new Error(`Weather HTTP ${response.status}`);
      const data = await response.json();
      const current = data.current ?? {};
      const weather = weatherFromCurrent(current);
      setLocalWeather(weather);
      setWeatherInfo({
        temperature: current.temperature_2m,
        precipitation: current.precipitation,
        cloudCover: current.cloud_cover,
        windSpeed: current.wind_speed_10m,
        code: current.weather_code,
      });
      setWeatherStatus("ready");
    } catch {
      setWeatherStatus("error");
    }
  }, []);

  const requestLocalWeather = useCallback(() => {
    setWeatherMode("auto");
    if (!navigator.geolocation) {
      setWeatherStatus("unsupported");
      return;
    }
    setWeatherStatus("locating");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        coordsRef.current = {
          latitude: coords.latitude,
          longitude: coords.longitude,
        };
        fetchWeather(coords.latitude, coords.longitude);
      },
      (error) => {
        setWeatherStatus(error.code === 1 ? "denied" : "error");
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 15 * 60 * 1000,
      },
    );
  }, [fetchWeather]);

  useEffect(() => {
    if (weatherMode !== "auto") return;
    if (!navigator.permissions?.query || !navigator.geolocation) return;

    navigator.permissions
      .query({ name: "geolocation" })
      .then((permission) => {
        if (permission.state !== "granted") return;
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            coordsRef.current = {
              latitude: coords.latitude,
              longitude: coords.longitude,
            };
            fetchWeather(coords.latitude, coords.longitude);
          },
          () => {},
          { maximumAge: 15 * 60 * 1000, timeout: 5000 },
        );
      })
      .catch(() => {});
  }, [fetchWeather, weatherMode]);

  useEffect(() => {
    if (weatherMode !== "auto" || !coordsRef.current) return undefined;
    const timer = window.setInterval(() => {
      const { latitude, longitude } = coordsRef.current;
      fetchWeather(latitude, longitude);
    }, 15 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [fetchWeather, weatherMode]);

  const phase =
    phaseMode === "auto" ? clockPhase : PRESENCE_PHASES[phaseMode];

  const weather =
    weatherMode === "auto"
      ? localWeather ?? WEATHER_TYPES.clear
      : WEATHER_TYPES[weatherMode];

  const mood = useMemo(() => getPresenceMood(phase, weather), [phase, weather]);

  return {
    phase,
    phaseMode,
    setPhaseMode,
    weather,
    weatherMode,
    setWeatherMode,
    mood,
    weatherInfo,
    weatherStatus,
    requestLocalWeather,
    hasLocalWeather: Boolean(localWeather),
  };
}
