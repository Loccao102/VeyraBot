import { useCallback, useEffect, useRef, useState } from "react";

const REACTION_COPY = {
  none: "",
  head_hover: "Sen noticed you.",
  head_pat: "A gentle little hello.",
  petal_hover: "A petal stirs.",
  petal_touch: "The petal answers your touch.",
  core_hold: "Warmth gathers within.",
  core_release: "A little warmth remains.",
  water_touch: "The pond remembers your touch.",
};

const now = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

export default function useInteractionManager() {
  const sequence = useRef(0);
  const clearTimer = useRef(null);
  const cooldowns = useRef(new Map());
  const rippleTimers = useRef(new Set());
  const heldTargetRef = useRef(null);

  const [reaction, setReaction] = useState({
    id: 0,
    type: "none",
    target: null,
    intensity: 0,
    startedAt: 0,
    duration: 1,
    label: "",
  });
  const [hoveredTarget, setHoveredTargetState] = useState(null);
  const [heldTarget, setHeldTarget] = useState(null);
  const [ripples, setRipples] = useState([]);

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

  const setHoveredTarget = useCallback(
    (target) => {
      setHoveredTargetState(target);
      if (!target) return;

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
    [trigger],
  );

  const patHead = useCallback(
    () =>
      trigger("head_pat", {
        target: "head",
        intensity: 1,
        duration: 1050,
        cooldown: 420,
      }),
    [trigger],
  );

  const touchPetal = useCallback(
    (side) =>
      trigger("petal_touch", {
        target: `petal:${side}`,
        intensity: 1,
        duration: 920,
        cooldown: 340,
      }),
    [trigger],
  );

  const beginCoreHold = useCallback(() => {
    heldTargetRef.current = "core";
    setHeldTarget("core");
    trigger("core_hold", {
      target: "core",
      intensity: 1,
      duration: 0,
      cooldown: 0,
      force: true,
    });
  }, [trigger]);

  const endCoreHold = useCallback(() => {
    if (heldTargetRef.current !== "core") return false;
    heldTargetRef.current = null;
    setHeldTarget(null);
    return trigger("core_release", {
      target: "core",
      intensity: 1,
      duration: 1050,
      cooldown: 0,
      force: true,
    });
  }, [trigger]);

  const touchWater = useCallback(
    (position) => {
      const id = ++sequence.current;
      const ripple = {
        id,
        position: [position[0], position[1], position[2]],
        startedAt: now(),
        duration: 1650,
      };
      setRipples((items) => [...items.slice(-7), ripple]);
      trigger("water_touch", {
        target: "water",
        intensity: 0.8,
        duration: 760,
        cooldown: 120,
      });

      const timer = window.setTimeout(() => {
        setRipples((items) => items.filter((item) => item.id !== id));
        rippleTimers.current.delete(timer);
      }, ripple.duration + 120);
      rippleTimers.current.add(timer);
    },
    [trigger],
  );

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
    setHoveredTarget,
    patHead,
    touchPetal,
    beginCoreHold,
    endCoreHold,
    touchWater,
    clearReaction,
  };
}
