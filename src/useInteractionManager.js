import { useCallback, useEffect, useRef, useState } from "react";

export const DISCOVERY_TOTAL = 5;

const REACTION_COPY = {
  none: "",
  head_hover: "Sen noticed you.",
  head_pat: "A gentle little hello.",
  petal_hover: "A petal stirs.",
  petal_touch: "The petal answers your touch.",
  core_hold: "Warmth gathers within.",
  core_release: "A little warmth remains.",
  water_touch: "The pond remembers your touch.",
  secret_shy: "Sen gets a little shy.",
  secret_petal_dance: "The petals learned your rhythm.",
  secret_pond_chorus: "The pond answers in chorus.",
  secret_night_fireflies: "The night answered Sen’s light.",
  secret_quiet_gaze: "Sen noticed the quiet.",
  ritual_thought: "Your thought found a place to rest.",
  ritual_focus_complete: "A quiet moment, completed.",
};

const DISCOVERY_NAMES = {
  shy: "A shy hello",
  petal_dance: "Petal rhythm",
  pond_chorus: "Pond chorus",
  night_fireflies: "Night fireflies",
  quiet_gaze: "Quiet gaze",
};

const now = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

export default function useInteractionManager({
  phase = "day",
  weather = "clear",
  state = "idle",
  enabled = true,
} = {}) {
  const sequence = useRef(0);
  const clearTimer = useRef(null);
  const cooldowns = useRef(new Map());
  const rippleTimers = useRef(new Set());
  const heldTargetRef = useRef(null);
  const coreHoldStartedAt = useRef(0);
  const headPatHistory = useRef([]);
  const petalHistory = useRef([]);
  const waterHistory = useRef([]);
  const lastActionAt = useRef(now());
  const quietTriggered = useRef(false);
  const discoveredRef = useRef(new Set());

  const [reaction, setReaction] = useState({
    id: 0,
    type: "none",
    target: null,
    intensity: 0,
    startedAt: 0,
    duration: 1,
    label: "",
    discoveryId: null,
  });
  const [hoveredTarget, setHoveredTargetState] = useState(null);
  const [heldTarget, setHeldTarget] = useState(null);
  const [ripples, setRipples] = useState([]);
  const [discoveries, setDiscoveries] = useState([]);
  const [lastDiscovery, setLastDiscovery] = useState(null);

  const markActivity = useCallback(() => {
    lastActionAt.current = now();
  }, []);

  const clearReaction = useCallback((expectedId) => {
    setReaction((current) => {
      if (expectedId != null && current.id !== expectedId) return current;
      return {
        id: current.id,
        type: "none",
        target: null,
        intensity: 0,
        startedAt: 0,
        duration: 1,
        label: "",
        discoveryId: null,
      };
    });
  }, []);

  const trigger = useCallback(
    (
      type,
      {
        target = null,
        intensity = 1,
        duration = 900,
        cooldown = 220,
        force = false,
        discoveryId = null,
      } = {},
    ) => {
      const timestamp = now();
      const cooldownKey = `${type}:${target ?? ""}`;
      if (!force && (cooldowns.current.get(cooldownKey) ?? 0) > timestamp) {
        return false;
      }
      cooldowns.current.set(cooldownKey, timestamp + cooldown);

      if (clearTimer.current) {
        window.clearTimeout(clearTimer.current);
        clearTimer.current = null;
      }

      const id = ++sequence.current;
      setReaction({
        id,
        type,
        target,
        intensity,
        startedAt: timestamp,
        duration,
        label: REACTION_COPY[type] ?? "",
        discoveryId,
      });

      if (duration > 0 && type !== "core_hold") {
        clearTimer.current = window.setTimeout(
          () => clearReaction(id),
          duration,
        );
      }

      return true;
    },
    [clearReaction],
  );

  const discover = useCallback(
    (discoveryId, type, options = {}) => {
      const isNew = !discoveredRef.current.has(discoveryId);
      if (isNew) {
        discoveredRef.current.add(discoveryId);
        const item = {
          id: discoveryId,
          name: DISCOVERY_NAMES[discoveryId] ?? discoveryId,
          foundAt: Date.now(),
        };
        setDiscoveries((items) => [...items, item]);
        setLastDiscovery(item);
      }

      trigger(type, {
        ...options,
        force: true,
        discoveryId,
      });
      return isNew;
    },
    [trigger],
  );

  const setHoveredTarget = useCallback(
    (target) => {
      setHoveredTargetState(target);
      if (!target) return;

      markActivity();
      if (target === "head") {
        trigger("head_hover", {
          target,
          intensity: 0.55,
          duration: 620,
          cooldown: 900,
        });
      } else if (target.startsWith("petal:")) {
        trigger("petal_hover", {
          target,
          intensity: 0.45,
          duration: 520,
          cooldown: 760,
        });
      }
    },
    [markActivity, trigger],
  );

  const patHead = useCallback(() => {
    if (!enabled) return false;
    markActivity();

    const timestamp = now();
    headPatHistory.current = [
      ...headPatHistory.current.filter((time) => timestamp - time < 4200),
      timestamp,
    ];

    if (headPatHistory.current.length >= 3) {
      headPatHistory.current = [];
      return discover("shy", "secret_shy", {
        target: "head",
        intensity: 1,
        duration: 2100,
        cooldown: 0,
      });
    }

    return trigger("head_pat", {
      target: "head",
      intensity: 1,
      duration: 1050,
      cooldown: 300,
    });
  }, [discover, enabled, markActivity, trigger]);

  const touchPetal = useCallback(
    (side) => {
      if (!enabled) return false;
      markActivity();

      const timestamp = now();
      petalHistory.current = [
        ...petalHistory.current.filter((item) => timestamp - item.time < 6500),
        { side, time: timestamp },
      ].slice(-5);

      const recent = petalHistory.current.slice(-4);
      const alternating =
        recent.length === 4 &&
        recent.every(
          (item, index) => index === 0 || item.side !== recent[index - 1].side,
        );

      if (alternating) {
        petalHistory.current = [];
        return discover("petal_dance", "secret_petal_dance", {
          target: "petals",
          intensity: 1,
          duration: 2300,
          cooldown: 0,
        });
      }

      return trigger("petal_touch", {
        target: `petal:${side}`,
        intensity: 1,
        duration: 920,
        cooldown: 260,
      });
    },
    [discover, enabled, markActivity, trigger],
  );

  const beginCoreHold = useCallback(() => {
    if (!enabled) return false;
    markActivity();
    heldTargetRef.current = "core";
    coreHoldStartedAt.current = now();
    setHeldTarget("core");
    return trigger("core_hold", {
      target: "core",
      intensity: 1,
      duration: 0,
      cooldown: 0,
      force: true,
    });
  }, [enabled, markActivity, trigger]);

  const endCoreHold = useCallback(() => {
    if (heldTargetRef.current !== "core") return false;

    const heldFor = now() - coreHoldStartedAt.current;
    heldTargetRef.current = null;
    coreHoldStartedAt.current = 0;
    setHeldTarget(null);
    markActivity();

    if (phase === "night" && heldFor >= 1200) {
      return discover("night_fireflies", "secret_night_fireflies", {
        target: "core",
        intensity: 1,
        duration: 2800,
        cooldown: 0,
      });
    }

    return trigger("core_release", {
      target: "core",
      intensity: Math.min(1.25, 0.72 + heldFor / 2200),
      duration: 1050,
      cooldown: 0,
      force: true,
    });
  }, [discover, markActivity, phase, trigger]);

  const addRipple = useCallback((position, duration = 1650, variant = "touch") => {
    const id = ++sequence.current;
    const ripple = {
      id,
      position: [position[0], position[1], position[2]],
      startedAt: now(),
      duration,
      variant,
    };
    setRipples((items) => [...items.slice(-11), ripple]);

    const timer = window.setTimeout(() => {
      setRipples((items) => items.filter((item) => item.id !== id));
      rippleTimers.current.delete(timer);
    }, duration + 160);
    rippleTimers.current.add(timer);
  }, []);

  const celebrateThought = useCallback(() => {
    if (!enabled) return false;
    markActivity();
    return trigger("ritual_thought", {
      target: "garden",
      intensity: 1,
      duration: 1800,
      cooldown: 0,
      force: true,
    });
  }, [enabled, markActivity, trigger]);

  const celebrateFocus = useCallback(() => {
    markActivity();
    return trigger("ritual_focus_complete", {
      target: "garden",
      intensity: 1,
      duration: 2600,
      cooldown: 0,
      force: true,
    });
  }, [markActivity, trigger]);

  const touchWater = useCallback(
    (position) => {
      if (!enabled) return false;
      markActivity();

      addRipple(position, 1650, weather === "rain" ? "rain" : "touch");

      const timestamp = now();
      waterHistory.current = [
        ...waterHistory.current.filter((time) => timestamp - time < 3600),
        timestamp,
      ];

      if (waterHistory.current.length >= 3) {
        waterHistory.current = [];

        const offsets = [
          [-0.32, 0.12],
          [0.26, -0.16],
          [0.08, 0.31],
        ];
        offsets.forEach(([dx, dz], index) => {
          window.setTimeout(
            () =>
              addRipple(
                [position[0] + dx, position[1], position[2] + dz],
                1900 + index * 130,
                weather === "rain" ? "rain_chorus" : "chorus",
              ),
            index * 110,
          );
        });

        return discover("pond_chorus", "secret_pond_chorus", {
          target: "water",
          intensity: 1,
          duration: 2200,
          cooldown: 0,
        });
      }

      return trigger("water_touch", {
        target: "water",
        intensity: 0.8,
        duration: 760,
        cooldown: 100,
      });
    },
    [addRipple, discover, enabled, markActivity, trigger, weather],
  );

  useEffect(() => {
    if (!enabled || state !== "idle") {
      quietTriggered.current = false;
      return undefined;
    }

    const timer = window.setInterval(() => {
      const quietFor = now() - lastActionAt.current;
      if (
        quietFor >= 14000 &&
        !quietTriggered.current &&
        heldTargetRef.current == null
      ) {
        quietTriggered.current = true;
        discover("quiet_gaze", "secret_quiet_gaze", {
          target: "head",
          intensity: 1,
          duration: 2400,
          cooldown: 0,
        });
      }
    }, 900);

    return () => window.clearInterval(timer);
  }, [discover, enabled, state]);

  useEffect(() => {
    if (state !== "idle") lastActionAt.current = now();
  }, [state]);

  useEffect(
    () => () => {
      if (clearTimer.current) window.clearTimeout(clearTimer.current);
      rippleTimers.current.forEach((timer) => window.clearTimeout(timer));
      rippleTimers.current.clear();
    },
    [],
  );

  return {
    reaction,
    hoveredTarget,
    heldTarget,
    ripples,
    discoveries,
    discoveryCount: discoveries.length,
    discoveryTotal: DISCOVERY_TOTAL,
    lastDiscovery,
    setHoveredTarget,
    patHead,
    touchPetal,
    beginCoreHold,
    endCoreHold,
    touchWater,
    celebrateThought,
    celebrateFocus,
    clearReaction,
  };
}
