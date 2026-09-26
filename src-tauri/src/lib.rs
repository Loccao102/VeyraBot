use serde::Serialize;
use serde_json::Value;
use std::{
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::{Arc, Mutex},
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
    pid: Arc<Mutex<Option<u32>>>,
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

    let recent_commits = git_output(
        path,
        &["log", "-5", "--pretty=format:%h %s"],
    )
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

        if let Some(text) = item.get("text").and_then(Value::as_str) {
            message = Some(text.to_string());
            continue;
        }

        if let Some(content) = item.get("content").and_then(Value::as_array) {
            let parts: Vec<&str> = content
                .iter()
                .filter_map(|part| part.get("text").and_then(Value::as_str))
                .collect();
            if !parts.is_empty() {
                message = Some(parts.join("\n"));
            }
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

fn build_codex_command(path: &Path, task: &str) -> Command {
    #[cfg(target_os = "windows")]
    {
        let mut command = Command::new("powershell");
        command
            .current_dir(path)
            .env("SEN_CODEX_TASK", task)
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
            .args(["exec", "--json", "--full-auto", task]);
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
async fn run_agent_task(
    runtime: State<'_, AgentRuntime>,
    path: String,
    task: String,
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

    let pid_slot = runtime.pid.clone();

    {
        let guard = pid_slot
            .lock()
            .map_err(|_| "Không thể truy cập agent runtime.".to_string())?;
        if guard.is_some() {
            return Err("Sen đang chạy một coding task khác.".to_string());
        }
    }

    tauri::async_runtime::spawn_blocking(move || {
        let mut command = build_codex_command(&canonical, &task);
        command.stdout(Stdio::piped()).stderr(Stdio::piped());

        let child = command
            .spawn()
            .map_err(|error| format!("Không thể khởi chạy Codex: {error}"))?;
        let pid = child.id();

        {
            let mut guard = pid_slot
                .lock()
                .map_err(|_| "Không thể lưu agent process.".to_string())?;
            *guard = Some(pid);
        }

        let output = child
            .wait_with_output()
            .map_err(|error| format!("Không thể chờ Codex hoàn thành: {error}"));

        if let Ok(mut guard) = pid_slot.lock() {
            *guard = None;
        }

        let output = output?;
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let snapshot = inspect_workspace_inner(&canonical);

        if !output.status.success() {
            let message = if stderr.is_empty() {
                "Codex dừng trước khi hoàn thành task.".to_string()
            } else {
                stderr.chars().take(1800).collect()
            };

            return Ok(AgentTaskResult {
                success: false,
                message,
                exit_code: output.status.code(),
                changed_files: snapshot.changes,
            });
        }

        Ok(AgentTaskResult {
            success: true,
            message: extract_codex_message(&stdout),
            exit_code: output.status.code(),
            changed_files: snapshot.changes,
        })
    })
    .await
    .map_err(|error| format!("Agent worker lỗi: {error}"))?
}

#[tauri::command]
fn cancel_agent_task(runtime: State<'_, AgentRuntime>) -> Result<bool, String> {
    let pid = runtime
        .pid
        .lock()
        .map_err(|_| "Không thể truy cập agent runtime.".to_string())?
        .take();

    let Some(pid) = pid else {
        return Ok(false);
    };

    #[cfg(target_os = "windows")]
    let status = Command::new("taskkill")
        .args(["/PID", &pid.to_string(), "/T", "/F"])
        .status();

    #[cfg(not(target_os = "windows"))]
    let status = Command::new("kill")
        .args(["-TERM", &pid.to_string()])
        .status();

    status
        .map(|value| value.success())
        .map_err(|error| format!("Không thể dừng Codex: {error}"))
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
