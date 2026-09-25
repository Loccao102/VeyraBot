import { useRef, useState } from 'react'

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export default function useVeyraAgent() {
  const [state, setState] = useState('idle')
  const [command, setCommand] = useState('')
  const [message, setMessage] = useState('Ready when you are.')
  const [history, setHistory] = useState([])
  const [isRunning, setIsRunning] = useState(false)
  const runId = useRef(0)

  const pushHistory = (type, text) => {
    setHistory(prev => [
      ...prev.slice(-4),
      { id: Date.now() + Math.random(), type, text }
    ])
  }

  const runCommand = async (rawCommand = command) => {
    const value = rawCommand.trim()
    if (!value || isRunning) return

    const id = ++runId.current
    setIsRunning(true)
    setCommand('')
    pushHistory('user', value)

    setState('listening')
    setMessage('I heard you.')
    await sleep(420)
    if (id !== runId.current) return

    setState('thinking')
    setMessage('Understanding the task and deciding what to do next…')
    await sleep(1050)
    if (id !== runId.current) return

    setState('working')
    setMessage('Working on it…')
    await sleep(1800)
    if (id !== runId.current) return

    setState('success')
    const response = buildDemoResponse(value)
    setMessage(response)
    pushHistory('veyra', response)
    await sleep(1200)
    if (id !== runId.current) return

    setState('idle')
    setMessage('Ready for the next thing.')
    setIsRunning(false)
  }

  const cancel = () => {
    runId.current += 1
    setIsRunning(false)
    setState('idle')
    setMessage('Cancelled.')
  }

  const startVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setMessage('Voice input is not supported in this browser.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = false

    setState('listening')
    setMessage('Listening…')

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join(' ')
      setCommand(transcript)
    }

    recognition.onerror = () => {
      setState('idle')
      setMessage('I could not hear that clearly.')
    }

    recognition.onend = () => {
      setState('idle')
      setMessage('Voice captured. Review it, then send.')
    }

    recognition.start()
  }

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
  }
}

function buildDemoResponse(command) {
  const q = command.toLowerCase()

  if (q.includes('videoget')) {
    return 'VideoGet context located. Next step: inspect the current Douyin discovery path and recent Git changes.'
  }

  if (q.includes('github') || q.includes('repo')) {
    return 'Repository task understood. I would inspect status, recent commits, open work, then choose the smallest safe next action.'
  }

  if (q.includes('design') || q.includes('ui')) {
    return 'Design task understood. I would inspect the current screen, identify the visual goal, then iterate and compare the result.'
  }

  if (q.includes('continue') || q.includes('làm tiếp')) {
    return 'I would recover the active project, last task, Git state and recent memory before continuing.'
  }

  return 'Task understood. The next milestone is connecting this lifecycle to real local tools, memory and coding agents.'
}
