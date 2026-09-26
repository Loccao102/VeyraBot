import { useRef, useState } from "react";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function useVeyraAgent({
  executeCommand = null,
  cancelExecution = null,
} = {}) {
  const [state, setState] = useState("idle");
  const [command, setCommand] = useState("");
  const [message, setMessage] = useState("Ready when you are.");
  const [history, setHistory] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const runId = useRef(0);

  const pushHistory = (type, text) => {
    setHistory((prev) => [
      ...prev.slice(-4),
      { id: Date.now() + Math.random(), type, text },
    ]);
  };

  const finishSuccess = async (id, response) => {
    if (id !== runId.current) return;

    setState("success");
    setMessage(response);
    pushHistory("sen", response);
    await sleep(900);

    if (id !== runId.current) return;
    setState("idle");
    setMessage("I’m here, whenever you’re ready.");
    setIsRunning(false);
  };

  const runCommand = async (rawCommand = command) => {
    const value = rawCommand.trim();
    if (!value || isRunning) return;

    const id = ++runId.current;
    setIsRunning(true);
    setCommand("");
    pushHistory("user", value);

    setState("listening");
    setMessage("I’m listening.");
    await sleep(220);
    if (id !== runId.current) return;

    setState("thinking");
    setMessage(
      executeCommand
        ? "Reading the workspace and choosing the next action…"
        : "Giving your idea a little thought…",
    );
    await sleep(executeCommand ? 420 : 900);
    if (id !== runId.current) return;

    setState("working");
    setMessage(
      executeCommand
        ? "Working inside your selected workspace…"
        : "Putting the next steps together…",
    );

    if (executeCommand) {
      try {
        const response = await executeCommand(value);
        await finishSuccess(id, response || "Task completed.");
      } catch (error) {
        if (id !== runId.current) return;
        const detail =
          typeof error === "string"
            ? error
            : error?.message || "The local agent could not finish this task.";
        setState("idle");
        setMessage(detail);
        pushHistory("sen", detail);
        setIsRunning(false);
      }
      return;
    }

    await sleep(1500);
    if (id !== runId.current) return;

    const response = buildDemoResponse(value);
    await finishSuccess(id, response);
  };

  const cancel = () => {
    runId.current += 1;
    Promise.resolve(cancelExecution?.()).catch(() => {});
    setIsRunning(false);
    setState("idle");
    setMessage("Stopped. I’m ready for the next instruction.");
  };

  const startVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessage("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    setState("listening");
    setMessage("Listening…");

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ");
      setCommand(transcript);
    };

    recognition.onerror = () => {
      setState("idle");
      setMessage("I could not hear that clearly.");
    };

    recognition.onend = () => {
      setState("idle");
      setMessage("Voice captured. Review it, then send.");
    };

    recognition.start();
  };

  return {
    state,
    setState,
    command,
    setCommand,
    message,
    history,
    isRunning,
    runCommand,
    cancel,
    startVoiceInput,
  };
}

function buildDemoResponse(command) {
  const q = command.toLowerCase();

  if (q.includes("videoget")) {
    return "For VideoGet, I would begin with the current discovery flow and recent changes. This browser preview is not connected to local project tools.";
  }

  if (q.includes("github") || q.includes("repo")) {
    return "Repository task understood. In the desktop app I can inspect a selected local Git workspace before choosing the next action.";
  }

  if (q.includes("design") || q.includes("ui")) {
    return "Design task understood. I would inspect the current screen, identify the visual goal, then iterate and compare the result.";
  }

  if (q.includes("continue") || q.includes("làm tiếp")) {
    return "In the desktop app I can recover the selected workspace, Git state and recent commits before continuing.";
  }

  return "Task understood. Open the desktop build and choose a workspace to hand this to a local coding agent.";
}
