use serde::Serialize;
use serde_json::Value;
use std::{
    collections::VecDeque,
    io::{BufRead, BufReader},
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::{Arc, Mutex},
    thread,
};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, State, WebviewWindow, WindowEvent,
};
use tauri_plugin_autostart::ManagerExt as AutostartManagerExt;
use tauri_plugin_global_shortcut::{
    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState,
};

#[derive(Default)]
struct AgentRuntime {
    shared: Arc<Mutex<AgentRuntimeState>>,
}

#[derive(Default)]
struct AgentRuntimeState {
    pid: Option<u32>,
    next_seq: u64,
    events: VecDeque<AgentEvent>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AgentEvent {
    seq: u64,
    kind: String,
    label: String,
    detail: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AgentInfo {
    id: String,
    label: String,
    available: bool,
    version: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceSummary {
    path: String,
    name: String,
    is_git: bool,
    branch: Option<String>,
    dirty_count: usize,
    changes: Vec<String>,
    recent_commits: Vec<String>,
    remote: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AgentTaskResult {
    success: bool,
    message: String,
    exit_code: Option<i32>,
    changed_files: Vec<String>,
}

fn toggle_main_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
    } else {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn toggle_always_on_top(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    let enabled = window.is_always_on_top().unwrap_or(false);
    let _ = window.set_always_on_top(!enabled);
}

fn toggle_autostart(app: &AppHandle) {
    let manager = app.autolaunch();
    if manager.is_enabled().unwrap_or(false) {
        let _ = manager.disable();
    } else {
        let _ = manager.enable();
    }
}

fn canonical_workspace(path: &str) -> Result<PathBuf, String> {
    let canonical = Path::new(path)
        .canonicalize()
        .map_err(|error| format!("Workspace không tồn tại: {error}"))?;

    if !canonical.is_dir() {
        return Err("Workspace phải là một thư mục.".to_string());
    }

    Ok(canonical)
}

fn command_output(mut command: Command) -> Option<String> {
    let output = command.output().ok()?;
    if !output.status.success() {
        return None;
    }

    let value = String::from_utf8_lossy(&output.stdout).trim().to_string();
    (!value.is_empty()).then_some(value)
}

fn git_output(path: &Path, args: &[&str]) -> Option<String> {
    let mut command = Command::new("git");
    command.current_dir(path).args(args);
    command_output(command)
}

fn inspect_workspace_inner(path: &Path) -> WorkspaceSummary {
    let name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("Workspace")
        .to_string();

    let is_git = git_output(path, &["rev-parse", "--is-inside-work-tree"])
        .is_some_and(|value| value == "true");

    if !is_git {
        return WorkspaceSummary {
            path: path.display().to_string(),
            name,
            is_git: false,
            branch: None,
            dirty_count: 0,
            changes: Vec::new(),
            recent_commits: Vec::new(),
            remote: None,
        };
    }

    let branch = git_output(path, &["branch", "--show-current"]);
    let status = git_output(path, &["status", "--short"]).unwrap_or_default();
    let changes: Vec<String> = status
        .lines()
        .filter(|line| !line.trim().is_empty())
        .take(12)
        .map(str::to_string)
        .collect();
    let dirty_count = status.lines().filter(|line| !line.trim().is_empty()).count();

    let recent_commits = git_output(path, &["log", "-5", "--pretty=format:%h %s"])
        .unwrap_or_default()
        .lines()
        .map(str::to_string)
        .collect();

    let remote = git_output(path, &["remote", "get-url", "origin"]);

    WorkspaceSummary {
        path: path.display().to_string(),
        name,
        is_git: true,
        branch,
        dirty_count,
        changes,
        recent_commits,
        remote,
    }
}

#[cfg(target_os = "windows")]
fn codex_version() -> Option<String> {
    let mut command = Command::new("powershell");
    command.args([
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "if (Get-Command codex -ErrorAction SilentlyContinue) { & codex --version } else { exit 127 }",
    ]);
    command_output(command)
}

#[cfg(not(target_os = "windows"))]
fn codex_version() -> Option<String> {
    let mut command = Command::new("codex");
    command.arg("--version");
    command_output(command)
}

fn truncate_text(value: &str, max_chars: usize) -> String {
    let trimmed = value.trim();
    if trimmed.chars().count() <= max_chars {
        return trimmed.to_string();
    }

    let mut result: String = trimmed.chars().take(max_chars).collect();
    result.push('…');
    result
}

fn value_text(value: &Value) -> Option<String> {
    if let Some(text) = value.get("text").and_then(Value::as_str) {
        if !text.trim().is_empty() {
            return Some(text.to_string());
        }
    }

    if let Some(content) = value.get("content").and_then(Value::as_array) {
        let parts: Vec<&str> = content
            .iter()
            .filter_map(|part| part.get("text").and_then(Value::as_str))
            .filter(|text| !text.trim().is_empty())
            .collect();

        if !parts.is_empty() {
            return Some(parts.join("\n"));
        }
    }

    None
}

fn extract_codex_message(stdout: &str) -> String {
    let mut message = None;

    for line in stdout.lines().filter(|line| !line.trim().is_empty()) {
        let Ok(event) = serde_json::from_str::<Value>(line) else {
            continue;
        };

        if event.get("type").and_then(Value::as_str) != Some("item.completed") {
            continue;
        }

        let Some(item) = event.get("item") else {
            continue;
        };

        if item.get("type").and_then(Value::as_str) != Some("agent_message") {
            continue;
        }

        if let Some(text) = value_text(item) {
            message = Some(text);
        }
    }

    message.unwrap_or_else(|| {
        stdout
            .lines()
            .rev()
            .find(|line| !line.trim().is_empty())
            .unwrap_or("Codex đã hoàn thành task.")
            .chars()
            .take(1800)
            .collect()
    })
}

fn codex_event_summary(line: &str) -> Option<(String, String, String)> {
    let event = serde_json::from_str::<Value>(line).ok()?;
    let event_type = event.get("type").and_then(Value::as_str)?;

    match event_type {
        "thread.started" => Some((
            "system".to_string(),
            "Session".to_string(),
            "Codex session started.".to_string(),
        )),
        "turn.started" => Some((
            "thinking".to_string(),
            "Plan".to_string(),
            "Reading context and planning the next action.".to_string(),
        )),
        "turn.completed" => Some((
            "done".to_string(),
            "Turn complete".to_string(),
            "Codex finished this turn.".to_string(),
        )),
        "turn.failed" => {
            let detail = event
                .get("error")
                .map(|value| value.to_string())
                .unwrap_or_else(|| "Codex turn failed.".to_string());
            Some((
                "error".to_string(),
                "Turn failed".to_string(),
                truncate_text(&detail, 420),
            ))
        }
        "item.started" | "item.completed" => {
            let item = event.get("item")?;
            let item_type = item.get("type").and_then(Value::as_str).unwrap_or("item");
            let completed = event_type == "item.completed";

            match item_type {
                "agent_message" if completed => value_text(item).map(|text| {
                    (
                        "message".to_string(),
                        "Sen".to_string(),
                        truncate_text(&text, 720),
                    )
                }),
                "reasoning" => value_text(item).map(|text| {
                    (
                        "thinking".to_string(),
                        if completed { "Reasoning" } else { "Thinking" }.to_string(),
                        truncate_text(&text, 360),
                    )
                }),
                "command_execution" => {
                    let command = item
                        .get("command")
                        .and_then(Value::as_str)
                        .or_else(|| item.get("cmd").and_then(Value::as_str))
                        .unwrap_or("Running a workspace command.");

                    if completed {
                        let exit_code = item.get("exit_code").and_then(Value::as_i64);
                        let output = item
                            .get("aggregated_output")
                            .and_then(Value::as_str)
                            .unwrap_or("");
                        let detail = if let Some(code) = exit_code {
                            if output.trim().is_empty() {
                                format!("Exit code {code} · {command}")
                            } else {
                                format!("Exit {code} · {}", truncate_text(output, 260))
                            }
                        } else {
                            truncate_text(command, 360)
                        };

                        Some(("command".to_string(), "Command finished".to_string(), detail))
                    } else {
                        Some((
                            "command".to_string(),
                            "Running command".to_string(),
                            truncate_text(command, 360),
                        ))
                    }
                }
                "file_change" if completed => {
                    let detail = item
                        .get("changes")
                        .map(|value| value.to_string())
                        .unwrap_or_else(|| "Workspace files were updated.".to_string());
                    Some((
                        "file".to_string(),
                        "Files changed".to_string(),
                        truncate_text(&detail, 420),
                    ))
                }
                "mcp_tool_call" => {
                    let tool = item
                        .get("tool")
                        .and_then(Value::as_str)
                        .or_else(|| item.get("name").and_then(Value::as_str))
                        .unwrap_or("tool");
                    Some((
                        "tool".to_string(),
                        if completed { "Tool finished" } else { "Using tool" }.to_string(),
                        truncate_text(tool, 240),
                    ))
                }
                "web_search" => Some((
                    "tool".to_string(),
                    "Web search".to_string(),
                    item.get("query")
                        .and_then(Value::as_str)
                        .map(|value| truncate_text(value, 300))
                        .unwrap_or_else(|| "Searching the web.".to_string()),
                )),
                "error" => Some((
                    "error".to_string(),
                    "Agent error".to_string(),
                    value_text(item)
                        .map(|value| truncate_text(&value, 420))
                        .unwrap_or_else(|| truncate_text(&item.to_string(), 420)),
                )),
                _ => None,
            }
        }
        _ => None,
    }
}

fn push_agent_event(
    shared: &Arc<Mutex<AgentRuntimeState>>,
    kind: impl Into<String>,
    label: impl Into<String>,
    detail: impl Into<String>,
) {
    let Ok(mut runtime) = shared.lock() else {
        return;
    };

    runtime.next_seq += 1;
    let seq = runtime.next_seq;
    runtime.events.push_back(AgentEvent {
        seq,
        kind: kind.into(),
        label: label.into(),
        detail: detail.into(),
    });

    while runtime.events.len() > 140 {
        runtime.events.pop_front();
    }
}

fn append_limited(buffer: &Arc<Mutex<String>>, value: &str, limit: usize) {
    let Ok(mut output) = buffer.lock() else {
        return;
    };

    if output.len() >= limit {
        return;
    }

    let remaining = limit.saturating_sub(output.len());
    let clipped: String = value.chars().take(remaining.min(20_000)).collect();
    output.push_str(&clipped);
    output.push('\n');
}

fn agent_policy_prompt(task: &str, approved_sensitive: bool) -> String {
    let policy = if approved_sensitive {
        "The user explicitly approved the sensitive actions stated in this task. Work only inside the selected workspace unless the task explicitly requires a related external action. Never modify operating-system security settings or access unrelated user data."
    } else {
        "Work only inside the selected workspace. Do not git push, deploy or publish, perform destructive bulk deletion, change operating-system settings, install global software, or access paths outside this workspace. If any of those actions are required, stop and explain what approval is needed."
    };

    format!(
        "You are working through Sen Desktop.\nSafety boundary: {policy}\n\nUser task:\n{task}"
    )
}

fn build_codex_command(path: &Path, task: &str, approved_sensitive: bool) -> Command {
    let prompt = agent_policy_prompt(task, approved_sensitive);

    #[cfg(target_os = "windows")]
    {
        let mut command = Command::new("powershell");
        command
            .current_dir(path)
            .env("SEN_CODEX_TASK", prompt)
            .args([
                "-NoLogo",
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "& codex exec --json --full-auto $env:SEN_CODEX_TASK",
            ]);
        command
    }

    #[cfg(not(target_os = "windows"))]
    {
        let mut command = Command::new("codex");
        command
            .current_dir(path)
            .args(["exec", "--json", "--full-auto", &prompt]);
        command
    }
}

#[tauri::command]
fn set_always_on_top(window: WebviewWindow, enabled: bool) -> Result<bool, String> {
    window
        .set_always_on_top(enabled)
        .map_err(|error| error.to_string())?;
    Ok(enabled)
}

#[tauri::command]
fn get_always_on_top(window: WebviewWindow) -> Result<bool, String> {
    window
        .is_always_on_top()
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn set_autostart(app: AppHandle, enabled: bool) -> Result<bool, String> {
    let manager = app.autolaunch();
    if enabled {
        manager.enable().map_err(|error| error.to_string())?;
    } else {
        manager.disable().map_err(|error| error.to_string())?;
    }
    manager.is_enabled().map_err(|error| error.to_string())
}

#[tauri::command]
fn get_autostart_enabled(app: AppHandle) -> Result<bool, String> {
    app.autolaunch()
        .is_enabled()
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn pick_workspace() -> Option<String> {
    rfd::FileDialog::new()
        .set_title("Choose a workspace for Sen")
        .pick_folder()
        .map(|path| path.display().to_string())
}

#[tauri::command]
fn inspect_workspace(path: String) -> Result<WorkspaceSummary, String> {
    let canonical = canonical_workspace(&path)?;
    Ok(inspect_workspace_inner(&canonical))
}

#[tauri::command]
fn detect_local_agents() -> Vec<AgentInfo> {
    let version = codex_version();

    vec![AgentInfo {
        id: "codex".to_string(),
        label: "Codex CLI".to_string(),
        available: version.is_some(),
        version,
    }]
}

#[tauri::command]
fn clear_agent_events(runtime: State<'_, AgentRuntime>) -> Result<bool, String> {
    let mut shared = runtime
        .shared
        .lock()
        .map_err(|_| "Không thể truy cập agent runtime.".to_string())?;

    if shared.pid.is_some() {
        return Ok(false);
    }

    shared.events.clear();
    shared.next_seq = 0;
    Ok(true)
}

#[tauri::command]
fn poll_agent_events(
    runtime: State<'_, AgentRuntime>,
    after_seq: u64,
) -> Result<Vec<AgentEvent>, String> {
    let shared = runtime
        .shared
        .lock()
        .map_err(|_| "Không thể truy cập agent runtime.".to_string())?;

    Ok(shared
        .events
        .iter()
        .filter(|event| event.seq > after_seq)
        .cloned()
        .collect())
}

#[tauri::command]
async fn run_agent_task(
    runtime: State<'_, AgentRuntime>,
    path: String,
    task: String,
    approved_sensitive: bool,
) -> Result<AgentTaskResult, String> {
    let task = task.trim().to_string();
    if task.is_empty() {
        return Err("Task đang trống.".to_string());
    }

    let canonical = canonical_workspace(&path)?;

    if codex_version().is_none() {
        return Err(
            "Chưa tìm thấy Codex CLI trong PATH. Cài/đăng nhập Codex rồi mở lại Sen."
                .to_string(),
        );
    }

    let shared = runtime.shared.clone();

    {
        let mut runtime = shared
            .lock()
            .map_err(|_| "Không thể truy cập agent runtime.".to_string())?;

        if runtime.pid.is_some() {
            return Err("Sen đang chạy một coding task khác.".to_string());
        }

        runtime.events.clear();
        runtime.next_seq = 0;
    }

    push_agent_event(
        &shared,
        "system",
        "Workspace",
        format!(
            "Starting in {}{}",
            canonical.display(),
            if approved_sensitive {
                " · sensitive action approved"
            } else {
                ""
            }
        ),
    );

    tauri::async_runtime::spawn_blocking(move || {
        let mut command = build_codex_command(&canonical, &task, approved_sensitive);
        command.stdout(Stdio::piped()).stderr(Stdio::piped());

        let mut child = command
            .spawn()
            .map_err(|error| format!("Không thể khởi chạy Codex: {error}"))?;
        let pid = child.id();

        {
            let mut runtime = shared
                .lock()
                .map_err(|_| "Không thể lưu agent process.".to_string())?;
            runtime.pid = Some(pid);
        }

        push_agent_event(
            &shared,
            "system",
            "Codex",
            format!("Process {pid} is running."),
        );

        let stdout = child.stdout.take();
        let stderr = child.stderr.take();
        let stdout_buffer = Arc::new(Mutex::new(String::new()));
        let stderr_buffer = Arc::new(Mutex::new(String::new()));

        let stdout_thread = stdout.map(|stdout| {
            let shared = shared.clone();
            let stdout_buffer = stdout_buffer.clone();

            thread::spawn(move || {
                let reader = BufReader::new(stdout);
                for line in reader.lines().map_while(Result::ok) {
                    append_limited(&stdout_buffer, &line, 220_000);
                    if let Some((kind, label, detail)) = codex_event_summary(&line) {
                        push_agent_event(&shared, kind, label, detail);
                    }
                }
            })
        });

        let stderr_thread = stderr.map(|stderr| {
            let shared = shared.clone();
            let stderr_buffer = stderr_buffer.clone();

            thread::spawn(move || {
                let reader = BufReader::new(stderr);
                for line in reader.lines().map_while(Result::ok) {
                    if line.trim().is_empty() {
                        continue;
                    }

                    append_limited(&stderr_buffer, &line, 60_000);
                    push_agent_event(
                        &shared,
                        "stderr",
                        "Codex",
                        truncate_text(&line, 420),
                    );
                }
            })
        });

        let status = child
            .wait()
            .map_err(|error| format!("Không thể chờ Codex hoàn thành: {error}"))?;

        if let Some(handle) = stdout_thread {
            let _ = handle.join();
        }
        if let Some(handle) = stderr_thread {
            let _ = handle.join();
        }

        if let Ok(mut runtime) = shared.lock() {
            runtime.pid = None;
        }

        let stdout = stdout_buffer
            .lock()
            .map(|value| value.clone())
            .unwrap_or_default();
        let stderr = stderr_buffer
            .lock()
            .map(|value| value.trim().to_string())
            .unwrap_or_default();
        let snapshot = inspect_workspace_inner(&canonical);

        if !status.success() {
            let message = if stderr.is_empty() {
                "Codex dừng trước khi hoàn thành task.".to_string()
            } else {
                truncate_text(&stderr, 1800)
            };

            push_agent_event(&shared, "error", "Task stopped", message.clone());

            return Ok(AgentTaskResult {
                success: false,
                message,
                exit_code: status.code(),
                changed_files: snapshot.changes,
            });
        }

        let message = extract_codex_message(&stdout);
        push_agent_event(
            &shared,
            "done",
            "Task completed",
            if snapshot.changes.is_empty() {
                "Workspace is clean after this task.".to_string()
            } else {
                format!("{} workspace change(s) detected.", snapshot.dirty_count)
            },
        );

        Ok(AgentTaskResult {
            success: true,
            message,
            exit_code: status.code(),
            changed_files: snapshot.changes,
        })
    })
    .await
    .map_err(|error| format!("Agent worker lỗi: {error}"))?
}

#[tauri::command]
fn cancel_agent_task(runtime: State<'_, AgentRuntime>) -> Result<bool, String> {
    let shared = runtime.shared.clone();
    let pid = {
        let mut runtime = shared
            .lock()
            .map_err(|_| "Không thể truy cập agent runtime.".to_string())?;
        runtime.pid.take()
    };

    let Some(pid) = pid else {
        return Ok(false);
    };

    push_agent_event(
        &shared,
        "warning",
        "Stopping",
        format!("Stopping Codex process {pid}…"),
    );

    #[cfg(target_os = "windows")]
    let status = Command::new("taskkill")
        .args(["/PID", &pid.to_string(), "/T", "/F"])
        .status();

    #[cfg(not(target_os = "windows"))]
    let status = Command::new("kill")
        .args(["-TERM", &pid.to_string()])
        .status();

    let stopped = status
        .map(|value| value.success())
        .map_err(|error| format!("Không thể dừng Codex: {error}"))?;

    if stopped {
        push_agent_event(&shared, "warning", "Stopped", "Task was stopped by the user.");
    }

    Ok(stopped)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let shortcut = Shortcut::new(
        Some(Modifiers::CONTROL | Modifiers::SHIFT),
        Code::Space,
    );

    tauri::Builder::default()
        .manage(AgentRuntime::default())
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .app_name("Sen")
                .args(["--minimized"])
                .build(),
        )
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, registered, event| {
                    if registered == &shortcut && event.state() == ShortcutState::Pressed {
                        toggle_main_window(app);
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            set_always_on_top,
            get_always_on_top,
            set_autostart,
            get_autostart_enabled,
            pick_workspace,
            inspect_workspace,
            detect_local_agents,
            clear_agent_events,
            poll_agent_events,
            run_agent_task,
            cancel_agent_task,
        ])
        .setup(move |app| {
            let start_minimized = std::env::args().any(|arg| arg == "--minimized");

            let show_hide =
                MenuItem::with_id(app, "show_hide", "Show / Hide Sen", true, None::<&str>)?;
            let pin =
                MenuItem::with_id(app, "toggle_top", "Toggle always on top", true, None::<&str>)?;
            let startup =
                MenuItem::with_id(app, "toggle_autostart", "Toggle start with Windows", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit Sen", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_hide, &pin, &startup, &quit])?;

            TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show_hide" => toggle_main_window(app),
                    "toggle_top" => toggle_always_on_top(app),
                    "toggle_autostart" => toggle_autostart(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            app.global_shortcut().register(shortcut)?;

            if let Some(window) = app.get_webview_window("main") {
                if start_minimized {
                    let _ = window.hide();
                }

                let window_on_close = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_on_close.hide();
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Sen desktop");
}
