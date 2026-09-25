import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "sen.p2.thoughts.v1";
const MAX_THOUGHTS = 24;

function readThoughts() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.slice(-MAX_THOUGHTS) : [];
  } catch {
    return [];
  }
}

function seedFrom(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) / 4294967295;
}

export default function useRitualGarden() {
  const [thoughts, setThoughts] = useState(readThoughts);
  const [selectedThoughtId, setSelectedThoughtId] = useState(null);
  const focusDeadlineRef = useRef(0);
  const focusTickRef = useRef(null);
  const [focus, setFocus] = useState({
    active: false,
    paused: false,
    durationMs: 25 * 60 * 1000,
    remainingMs: 25 * 60 * 1000,
    completionId: 0,
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(thoughts));
    } catch {
      // Local persistence is a convenience in P2; the garden still works without it.
    }
  }, [thoughts]);

  const addThought = useCallback((rawText) => {
    const text = rawText.trim().replace(/\s+/g, " ").slice(0, 160);
    if (!text) return null;

    const createdAt = Date.now();
    const id = `thought-${createdAt.toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const thought = {
      id,
      text,
      createdAt,
      seed: seedFrom(`${text}:${createdAt}`),
    };

    setThoughts((items) => [...items.slice(-(MAX_THOUGHTS - 1)), thought]);
    setSelectedThoughtId(id);
    return thought;
  }, []);

  const removeThought = useCallback((id) => {
    setThoughts((items) => items.filter((item) => item.id !== id));
    setSelectedThoughtId((current) => (current === id ? null : current));
  }, []);

  const selectThought = useCallback((id) => {
    setSelectedThoughtId(id);
  }, []);

  const selectedThought = useMemo(
    () => thoughts.find((item) => item.id === selectedThoughtId) ?? null,
    [selectedThoughtId, thoughts],
  );

  const clearFocusTicker = useCallback(() => {
    if (focusTickRef.current) {
      window.clearInterval(focusTickRef.current);
      focusTickRef.current = null;
    }
  }, []);

  const completeFocus = useCallback(() => {
    clearFocusTicker();
    focusDeadlineRef.current = 0;
    setFocus((current) => ({
      ...current,
      active: false,
      paused: false,
      remainingMs: 0,
      completionId: current.completionId + 1,
    }));
  }, [clearFocusTicker]);

  const startTicker = useCallback(() => {
    clearFocusTicker();
    focusTickRef.current = window.setInterval(() => {
      setFocus((current) => {
        if (!current.active || current.paused) return current;
        const remainingMs = Math.max(0, focusDeadlineRef.current - Date.now());
        if (remainingMs <= 0) {
          window.setTimeout(completeFocus, 0);
          return { ...current, remainingMs: 0 };
        }
        return { ...current, remainingMs };
      });
    }, 250);
  }, [clearFocusTicker, completeFocus]);

  const startFocus = useCallback(
    (minutes = 25) => {
      const durationMs = Math.max(1, minutes) * 60 * 1000;
      focusDeadlineRef.current = Date.now() + durationMs;
      setFocus((current) => ({
        ...current,
        active: true,
        paused: false,
        durationMs,
        remainingMs: durationMs,
      }));
      startTicker();
    },
    [startTicker],
  );

  const toggleFocusPause = useCallback(() => {
    setFocus((current) => {
      if (!current.active) return current;

      if (current.paused) {
        focusDeadlineRef.current = Date.now() + current.remainingMs;
        window.setTimeout(startTicker, 0);
        return { ...current, paused: false };
      }

      const remainingMs = Math.max(0, focusDeadlineRef.current - Date.now());
      clearFocusTicker();
      return { ...current, paused: true, remainingMs };
    });
  }, [clearFocusTicker, startTicker]);

  const stopFocus = useCallback(() => {
    clearFocusTicker();
    focusDeadlineRef.current = 0;
    setFocus((current) => ({
      ...current,
      active: false,
      paused: false,
      remainingMs: current.durationMs,
    }));
  }, [clearFocusTicker]);

  useEffect(
    () => () => {
      clearFocusTicker();
    },
    [clearFocusTicker],
  );

  return {
    thoughts,
    thoughtCount: thoughts.length,
    selectedThought,
    selectedThoughtId,
    addThought,
    removeThought,
    selectThought,
    clearSelectedThought: () => setSelectedThoughtId(null),
    focus,
    startFocus,
    toggleFocusPause,
    stopFocus,
  };
}
