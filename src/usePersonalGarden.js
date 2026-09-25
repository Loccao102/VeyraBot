import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "sen.p3.personal.v1";
const SESSION_KEY = "sen.p3.visit-recorded";

const LEVELS = [
  { level: 1, name: "First Light", threshold: 0, unlocks: ["SenDNA"] },
  { level: 2, name: "First Leaf", threshold: 10, unlocks: ["Lotus leaves"] },
  { level: 3, name: "Quiet Pond", threshold: 28, unlocks: ["River stones"] },
  { level: 4, name: "Growing Garden", threshold: 55, unlocks: ["Fireflies"] },
  { level: 5, name: "Lotus Home", threshold: 95, unlocks: ["Garden lantern"] },
];

function dayKey(timestamp = Date.now()) {
  const date = new Date(timestamp);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function createSeed() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function defaultProfile() {
  const now = Date.now();
  return {
    version: 1,
    seed: createSeed(),
    createdAt: now,
    lastSeenAt: now,
    visitCount: 0,
    visitDays: [],
    thoughtsPlaced: 0,
    focusMinutes: 0,
    focusSessions: 0,
    discoveries: [],
    captures: 0,
  };
}

function readProfile() {
  if (typeof window === "undefined") return defaultProfile();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!parsed || typeof parsed !== "object") return defaultProfile();
    return {
      ...defaultProfile(),
      ...parsed,
      seed: parsed.seed || createSeed(),
      visitDays: Array.isArray(parsed.visitDays) ? parsed.visitDays.slice(-90) : [],
      discoveries: Array.isArray(parsed.discoveries) ? parsed.discoveries : [],
    };
  } catch {
    return defaultProfile();
  }
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createDNA(seed) {
  const random = mulberry32(hashString(seed));
  const natureOptions = ["Calm", "Curious", "Warm", "Dreamy"];
  const nature = natureOptions[Math.floor(random() * natureOptions.length)];

  const petalHue = 338 + random() * 14;
  const petalLight = 69 + random() * 5;
  const leafHue = 105 + random() * 22;
  const leafLight = 39 + random() * 7;
  const coreHue = 340 + random() * 16;
  const goldHue = 31 + random() * 13;

  return {
    signature: seed.slice(0, 8).toUpperCase(),
    nature,
    petalPrimary: `hsl(${petalHue.toFixed(1)} 64% ${petalLight.toFixed(1)}%)`,
    petalSoft: `hsl(${(petalHue + 4).toFixed(1)} 72% 88%)`,
    leaf: `hsl(${leafHue.toFixed(1)} 24% ${leafLight.toFixed(1)}%)`,
    core: `hsl(${coreHue.toFixed(1)} 68% 72%)`,
    coreGlow: `hsl(${(coreHue - 2).toFixed(1)} 72% 66%)`,
    gold: `hsl(${goldHue.toFixed(1)} 42% 57%)`,
    warmth: 0.45 + random() * 0.45,
    drift: 0.75 + random() * 0.45,
  };
}

function getScore(profile) {
  return (
    profile.visitDays.length * 3 +
    profile.thoughtsPlaced * 4 +
    profile.focusMinutes * 0.12 +
    profile.discoveries.length * 8 +
    profile.captures * 2
  );
}

function getLevelInfo(score) {
  let current = LEVELS[0];
  for (const item of LEVELS) {
    if (score >= item.threshold) current = item;
  }
  const next = LEVELS.find((item) => item.level === current.level + 1) ?? null;
  const progress = next
    ? Math.max(
        0,
        Math.min(
          1,
          (score - current.threshold) / (next.threshold - current.threshold),
        ),
      )
    : 1;
  return { ...current, next, progress };
}

export default function usePersonalGarden({ existingThoughts = 0 } = {}) {
  const [profile, setProfile] = useState(readProfile);
  const migratedThoughtsRef = useRef(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // P3 stays usable even if local persistence is unavailable.
    }
  }, [profile]);

  useEffect(() => {
    const today = dayKey();
    let alreadyRecorded = false;
    try {
      alreadyRecorded = window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      alreadyRecorded = false;
    }

    setProfile((current) => {
      const visitDays = current.visitDays.includes(today)
        ? current.visitDays
        : [...current.visitDays, today].slice(-90);

      return {
        ...current,
        visitCount: alreadyRecorded ? current.visitCount : current.visitCount + 1,
        visitDays,
        lastSeenAt: Date.now(),
      };
    });

    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Ignore session storage failures.
    }
  }, []);

  useEffect(() => {
    if (migratedThoughtsRef.current) return;
    migratedThoughtsRef.current = true;
    if (!existingThoughts) return;

    setProfile((current) => ({
      ...current,
      thoughtsPlaced: Math.max(current.thoughtsPlaced, existingThoughts),
    }));
  }, [existingThoughts]);

  const registerThought = useCallback(() => {
    setProfile((current) => ({
      ...current,
      thoughtsPlaced: current.thoughtsPlaced + 1,
      lastSeenAt: Date.now(),
    }));
  }, []);

  const registerFocus = useCallback((minutes) => {
    const safeMinutes = Math.max(0, Number(minutes) || 0);
    setProfile((current) => ({
      ...current,
      focusMinutes: current.focusMinutes + safeMinutes,
      focusSessions: current.focusSessions + 1,
      lastSeenAt: Date.now(),
    }));
  }, []);

  const registerDiscovery = useCallback((id) => {
    if (!id) return;
    setProfile((current) => {
      if (current.discoveries.includes(id)) return current;
      return {
        ...current,
        discoveries: [...current.discoveries, id],
        lastSeenAt: Date.now(),
      };
    });
  }, []);

  const registerCapture = useCallback(() => {
    setProfile((current) => ({
      ...current,
      captures: current.captures + 1,
      lastSeenAt: Date.now(),
    }));
  }, []);

  const dna = useMemo(() => createDNA(profile.seed), [profile.seed]);
  const score = useMemo(() => getScore(profile), [profile]);
  const levelInfo = useMemo(() => getLevelInfo(score), [score]);
  const ageDays = Math.max(
    1,
    Math.floor((Date.now() - profile.createdAt) / 86_400_000) + 1,
  );

  return {
    profile,
    dna,
    score,
    level: levelInfo.level,
    levelName: levelInfo.name,
    nextLevel: levelInfo.next,
    progress: levelInfo.progress,
    unlocks: LEVELS.filter((item) => item.level <= levelInfo.level).flatMap(
      (item) => item.unlocks,
    ),
    ageDays,
    discoveryCount: profile.discoveries.length,
    registerThought,
    registerFocus,
    registerDiscovery,
    registerCapture,
  };
}
