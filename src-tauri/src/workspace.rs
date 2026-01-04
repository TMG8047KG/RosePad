use lazy_static::lazy_static;
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::{
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
};
use tauri::{AppHandle, Emitter};
use zip::{write::FileOptions, ZipArchive, ZipWriter};

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectDto {
    pub id: String,
    pub kind: String,
    pub name: String,
    pub path: String,
    pub ext: Option<String>,
    pub title: Option<String>,
    pub last_modified_ms: i64,
    pub size: i64,
    pub parent_physical_folder: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PhysicalFolderScanDto {
    pub path: String,
    pub name: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResultDto {
    pub root_projects: Vec<ProjectDto>,
    pub physical_folders: Vec<(PhysicalFolderScanDto, Vec<ProjectDto>)>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyzeResultDto {
    pub projects: Vec<ProjectDto>,
    pub delete_project_paths: Vec<String>,
    pub physical_folders: Vec<PhysicalFolderScanDto>,
    pub delete_physical_folders: Vec<String>,
}

fn canonicalize_allow_missing(p: &Path) -> Result<PathBuf, String> {
    if p.exists() {
        return p.canonicalize().map_err(|e| e.to_string());
    }
    let parent = p.parent().ok_or_else(|| "path has no parent".to_string())?;
    let parent_canon = parent.canonicalize().map_err(|e| e.to_string())?;
    let name = p
        .file_name()
        .ok_or_else(|| "path has no filename".to_string())?;
    Ok(parent_canon.join(name))
}

fn ensure_inside_root(root: &str, target: &Path) -> Result<PathBuf, String> {
    let root_canon = Path::new(root)
        .canonicalize()
        .map_err(|e| format!("workspace root invalid: {e}"))?;
    let tgt = canonicalize_allow_missing(target)?;
    if !tgt.starts_with(&root_canon) {
        return Err("path is outside workspace root".into());
    }
    Ok(tgt)
}

fn mtime_ms(md: &fs::Metadata) -> i64 {
    use std::time::SystemTime;
    match md.modified() {
        Ok(t) => t
            .duration_since(SystemTime::UNIX_EPOCH)
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0),
        Err(_) => 0,
    }
}

fn read_rpad_title(path: &Path) -> Option<String> {
    let file = fs::File::open(path).ok()?;
    let mut zip = zip::ZipArchive::new(file).ok()?;
    let mut f = zip.by_name("manifest.json").ok()?;
    let mut s = String::new();
    let _ = f.read_to_string(&mut s).ok()?;
    let v: serde_json::Value = serde_json::from_str(&s).ok()?;
    v.get("title")
        .and_then(|t| t.as_str())
        .map(|s| s.to_string())
}

fn detect_kind_ext(ext: &str) -> (&'static str, Option<String>) {
    match ext {
        "rpad" => ("rpad", None),
        "doc" | "docx" => ("doc", Some("doc".into())),
        "pdf" => ("pdf", Some("pdf".into())),
        "txt" => ("txt", Some("txt".into())),
        "" => ("txt", None),
        // Treat common text/code formats as text while preserving the extension for display
        "md" | "mdx" | "json" | "log" | "js" | "jsx" | "ts" | "tsx" | "html" | "htm" | "css"
        | "scss" | "sass" | "less" | "xml" | "yaml" | "yml" | "ini" | "cfg" | "conf" | "env"
        | "properties" | "toml" | "csv" | "tsv" | "sql" | "sh" | "bash" | "zsh" | "ksh" | "bat"
        | "cmd" | "ps1" | "psm1" | "py" | "rs" | "go" | "java" | "kt" | "kts" | "c" | "cpp"
        | "cxx" | "h" | "hpp" | "hh" | "m" | "mm" | "swift" | "scala" | "rb" | "php" | "pl"
        | "lua" | "r" | "tex" | "groovy" | "gradle" | "dart" | "erl" | "ex" | "exs" | "elm"
        | "clj" | "cljs" | "coffee" | "hx" | "vb" | "vbs" | "f90" | "f95" | "f03" | "make"
        | "mk" | "cmake" => ("txt", Some(ext.into())),
        _ => ("txt", Some(ext.into())),
    }
}

fn stable_id(path: &str) -> String {
    let h = blake3::hash(path.as_bytes());
    format!("{}", h.to_hex())
}

#[tauri::command]
pub async fn scan_workspace(root: String) -> Result<ScanResultDto, String> {
    use std::path::PathBuf;
    let root_path = PathBuf::from(&root);
    if !root_path.is_dir() {
        return Err("workspace root is not a directory".into());
    }

    let mut root_projects: Vec<ProjectDto> = Vec::new();
    let mut physical_folders: Vec<(PhysicalFolderScanDto, Vec<ProjectDto>)> = Vec::new();

    let entries = match fs::read_dir(&root_path) {
        Ok(it) => it,
        Err(e) => return Err(format!("cannot read workspace root: {e}")),
    };

    for entry in entries {
        let entry = match entry {
            Ok(x) => x,
            Err(_) => continue,
        };
        let p = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if p.is_dir() {
            let mut items: Vec<ProjectDto> = Vec::new();
            if let Ok(children) = fs::read_dir(&p) {
                for child in children {
                    let child = match child {
                        Ok(x) => x,
                        Err(_) => continue,
                    };
                    let cp = child.path();
                    if !cp.is_file() {
                        continue;
                    }

                    if !allowed_ext(&cp) {
                        continue;
                    }
                    let ext = cp
                        .extension()
                        .and_then(|s| s.to_str())
                        .map(|s| s.to_lowercase())
                        .unwrap_or_else(|| "".to_string());

                    let md = match fs::metadata(&cp) {
                        Ok(m) => m,
                        Err(_) => continue,
                    };
                    let name = cp
                        .file_stem()
                        .and_then(|s| s.to_str())
                        .unwrap_or("")
                        .to_string();
                    let (kind, ext_out) = detect_kind_ext(&ext);
                    let path_s = cp.to_string_lossy().to_string();
                    let id = stable_id(&path_s);
                    let mtime = mtime_ms(&md);
                    let size = md.len() as i64;
                    let title = if kind == "rpad" {
                        read_rpad_title(&cp)
                    } else {
                        None
                    };

                    items.push(ProjectDto {
                        id,
                        kind: kind.into(),
                        name,
                        path: path_s,
                        ext: ext_out,
                        title,
                        last_modified_ms: mtime,
                        size,
                        parent_physical_folder: Some(p.to_string_lossy().to_string()),
                    });
                }
            } // unreadable subdir → skip it
            physical_folders.push((
                PhysicalFolderScanDto {
                    path: p.to_string_lossy().to_string(),
                    name,
                },
                items,
            ));
        } else if p.is_file() {
            if !allowed_ext(&p) {
                continue;
            }
            let ext = p
                .extension()
                .and_then(|s| s.to_str())
                .map(|s| s.to_lowercase())
                .unwrap_or_else(|| "".to_string());

            let md = match fs::metadata(&p) {
                Ok(m) => m,
                Err(_) => continue,
            };
            let name_s = p
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_string();
            let (kind, ext_out) = detect_kind_ext(&ext);
            let path_s = p.to_string_lossy().to_string();
            let id = stable_id(&path_s);
            let mtime = mtime_ms(&md);
            let size = md.len() as i64;
            let title = if kind == "rpad" {
                read_rpad_title(&p)
            } else {
                None
            };

            root_projects.push(ProjectDto {
                id,
                kind: kind.into(),
                name: name_s,
                path: path_s,
                ext: ext_out,
                title,
                last_modified_ms: mtime,
                size,
                parent_physical_folder: None,
            });
        }
    }

    Ok(ScanResultDto {
        root_projects,
        physical_folders,
    })
}

#[tauri::command]
pub async fn rename_project(
    _app: AppHandle,
    workspace_root: String,
    old_path: String,
    new_name: String,
) -> Result<String, String> {
    let p = PathBuf::from(&old_path);
    let _ = ensure_inside_root(&workspace_root, &p)?;
    if !p.is_file() {
        return Err("not a file".into());
    }
    let ext = p
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    // For .rpad, prefer updating the manifest title and keep the file name as-is (allows duplicate display names)
    if ext == "rpad" {
        // Preserve HTML content; fail fast if we cannot read
        let html = read_rpad_data(old_path.clone()).await?;
        // Overwrite the archive with the same path, updating title and keeping attachments
        write_rpad_html(old_path.clone(), html, Some(new_name.clone())).await?;
        return Ok(p.to_string_lossy().to_string());
    }

    // For non-rpad files, perform a physical rename but ensure uniqueness
    let parent = p.parent().ok_or_else(|| "no parent".to_string())?;
    let target = if ext.is_empty() {
        parent.join(&new_name)
    } else {
        parent.join(format!("{}.{}", new_name, ext))
    };
    let dest = unique_dest(target);
    fs::rename(&p, &dest).map_err(|e| e.to_string())?;
    Ok(dest.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn delete_project(_app: AppHandle, workspace_root: String, path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    let _ = ensure_inside_root(&workspace_root, &p)?;
    fs::remove_file(&p).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn move_project(
    _app: AppHandle,
    workspace_root: String,
    old_path: String,
    dest_dir: String,
) -> Result<String, String> {
    let src = PathBuf::from(&old_path);
    let _ = ensure_inside_root(&workspace_root, &src)?;
    if !src.is_file() {
        return Err("not a file".into());
    }
    let dest = PathBuf::from(&dest_dir);
    let dest_checked = ensure_inside_root(&workspace_root, &dest)?;
    if !dest.is_dir() {
        return Err("destination is not a directory".into());
    }
    let file_name = src
        .file_name()
        .ok_or_else(|| "invalid source".to_string())?;
    let candidate = dest_checked.join(file_name);
    let new_path = unique_dest(candidate);
    fs::rename(&src, &new_path).map_err(|e| e.to_string())?;
    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn rename_physical_folder(
    _app: AppHandle,
    workspace_root: String,
    path: String,
    new_name: String,
) -> Result<String, String> {
    let p = PathBuf::from(&path);
    let _ = ensure_inside_root(&workspace_root, &p)?;
    if !p.is_dir() {
        return Err("not a directory".into());
    }
    let parent = p.parent().ok_or_else(|| "no parent".to_string())?;
    let new_path = parent.join(&new_name);
    fs::rename(&p, &new_path).map_err(|e| e.to_string())?;
    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn delete_physical_folder(_app: AppHandle, workspace_root: String, path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    let _ = ensure_inside_root(&workspace_root, &p)?;
    if !p.is_dir() {
        return Err("not a directory".into());
    }
    fs::remove_dir_all(&p).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn create_physical_folder(
    _app: AppHandle,
    root: String,
    name: String,
) -> Result<String, String> {
    let r = PathBuf::from(&root);
    let root_checked = ensure_inside_root(&root, &r)?;
    if !root_checked.is_dir() {
        return Err("root is not a directory".into());
    }
    let new_path = root_checked.join(&name);
    if new_path.exists() {
        return Ok(new_path.to_string_lossy().to_string());
    }
    fs::create_dir_all(&new_path).map_err(|e| e.to_string())?;
    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn watch_physical_folders(
    app: tauri::AppHandle,
    folders: Vec<String>,
) -> Result<(), String> {
    let handle = app.clone();

    // Single global watcher instance; replace watched folders on subsequent calls
    lazy_static! {
        static ref WATCHER: Mutex<Option<(RecommendedWatcher, Vec<String>)>> = Mutex::new(None);
    }

    let mut guard = WATCHER
        .lock()
        .map_err(|_| "watcher lock poisoned".to_string())?;
    if let Some((ref mut watcher, ref mut prev)) = *guard {
        // Unwatch previous folders
        for p in prev.drain(..) {
            let _ = watcher.unwatch(Path::new(&p));
        }
        // Watch new folders
        for f in &folders {
            let _ = watcher.watch(Path::new(&f), RecursiveMode::Recursive);
        }
        *prev = folders;
        return Ok(());
    }

    // Create a new watcher
    let mut watcher: RecommendedWatcher =
        notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
            if let Ok(event) = res {
                let paths: Vec<String> = event
                    .paths
                    .iter()
                    .map(|p| p.to_string_lossy().to_string())
                    .collect();
                let _ = handle.emit("fs:changed", paths);
            }
        })
        .map_err(|e| format!("failed to create file watcher: {e}"))?;

    for f in &folders {
        let _ = watcher.watch(Path::new(&f), RecursiveMode::Recursive);
    }

    *guard = Some((watcher, folders));
    Ok(())
}

#[tauri::command]
pub async fn read_rpad_data(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    let file = fs::File::open(p).map_err(|e| e.to_string())?;
    let mut zip = ZipArchive::new(file).map_err(|e| e.to_string())?;

    // Try common data entries
    for candidate in [
        "data.json",
        "content.json",
        "document.json",
        "data/data.json",
    ] {
        if let Ok(mut f) = zip.by_name(candidate) {
            let mut s = String::new();
            f.read_to_string(&mut s).map_err(|e| e.to_string())?;
            // If it's JSON with { html }, return that; else return raw
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&s) {
                if let Some(h) = v.get("html").and_then(|x| x.as_str()) {
                    return Ok(h.to_string());
                }
            }
            return Ok(s);
        }
    }
    // Fallback: try a literal HTML file if present
    if let Ok(mut f) = zip.by_name("content.html") {
        let mut s = String::new();
        f.read_to_string(&mut s).map_err(|e| e.to_string())?;
        return Ok(s);
    }
    Err("data not found in .rpad".into())
}

#[tauri::command]
pub async fn write_rpad_html(
    path: String,
    html: String,
    title: Option<String>,
) -> Result<(), String> {
    let p = Path::new(&path);
    let parent = p.parent().ok_or_else(|| "invalid path".to_string())?;

    let temp_path = {
        let mut i = 0usize;
        let mut candidate = parent.join(format!(
            ".{}.tmp",
            p.file_name()
                .and_then(|s| s.to_str())
                .unwrap_or("rosepad")
        ));
        while candidate.exists() {
            i += 1;
            candidate = parent.join(format!(
                ".{}.tmp{}",
                p.file_name()
                    .and_then(|s| s.to_str())
                    .unwrap_or("rosepad"),
                i
            ));
        }
        candidate
    };

    let mut preserved: Vec<(String, Vec<u8>, zip::CompressionMethod)> = Vec::new();
    let mut existing_title: Option<String> = None;
    let mut existing_version: Option<i64> = None;

    if p.exists() {
        let file = fs::File::open(p).map_err(|e| e.to_string())?;
        let mut archive = ZipArchive::new(file).map_err(|e| format!("failed to read existing archive: {e}"))?;
        for i in 0..archive.len() {
            let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
            let name = entry.name().to_string();
            if name == "manifest.json" {
                let mut buf = String::new();
                let _ = entry.read_to_string(&mut buf);
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&buf) {
                    if existing_title.is_none() {
                        existing_title = v.get("title").and_then(|x| x.as_str()).map(|s| s.to_string());
                    }
                    if existing_version.is_none() {
                        existing_version = v.get("version").and_then(|x| x.as_i64());
                    }
                }
                continue;
            }
            if name == "data.json" {
                continue;
            }
            let mut buf = Vec::new();
            entry
                .read_to_end(&mut buf)
                .map_err(|e| format!("failed to copy existing entry {name}: {e}"))?;
            let method = entry.compression();
            preserved.push((name, buf, method));
        }
    }

    let chosen_title = title.or(existing_title).unwrap_or_else(|| "Untitled".to_string());
    let version = existing_version.unwrap_or(1);

    {
        let file = fs::File::create(&temp_path).map_err(|e| e.to_string())?;
        let mut zip = ZipWriter::new(file);

        for (name, data, method) in preserved {
            let opts = FileOptions::default().compression_method(method);
            let entry_name = name;
            zip.start_file(&entry_name, opts)
                .map_err(|e| format!("failed to start preserved entry {entry_name}: {e}"))?;
            zip.write_all(&data)
                .map_err(|e| format!("failed to write preserved entry {entry_name}: {e}"))?;
        }

        let options = FileOptions::default().compression_method(zip::CompressionMethod::Deflated);

        let manifest = serde_json::json!({
          "title": chosen_title,
          "version": version
        });
        zip.start_file("manifest.json", options)
            .map_err(|e| e.to_string())?;
        zip.write(manifest.to_string().as_bytes())
            .map_err(|e| e.to_string())?;

        let data = serde_json::json!({ "html": html });
        zip.start_file("data.json", options)
            .map_err(|e| e.to_string())?;
        zip.write(data.to_string().as_bytes())
            .map_err(|e| e.to_string())?;

        zip.finish().map_err(|e| e.to_string())?;
    }

    if let Err(e) = fs::rename(&temp_path, p) {
        // Attempt replace if target exists
        if p.exists() {
            let _ = fs::remove_file(p);
            fs::rename(&temp_path, p).map_err(|e2| format!("failed to replace file: {e2}"))?;
        } else {
            let _ = fs::remove_file(&temp_path);
            return Err(e.to_string());
        }
    }
    Ok(())
}

fn allowed_ext(p: &Path) -> bool {
    let ext_opt = p
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_ascii_lowercase());
    let ext = match ext_opt {
        Some(e) => e,
        None => return true, // allow extension-less text files
    };

    // Skip clearly binary/heavy formats to avoid junk in the workspace tree
    const BLOCKED: &[&str] = &[
        "exe", "dll", "so", "dylib", "bin", "apk", "msi", "dmg", "iso", "img", "jar", "war", "zip",
        "tar", "tgz", "gz", "bz2", "xz", "7z", "rar", "jpg", "jpeg", "png", "gif", "bmp", "webp",
        "ico", "psd", "ai", "sketch", "mp3", "wav", "flac", "ogg", "mp4", "mkv", "avi", "mov",
        "wmv", "woff", "woff2", "ttf", "otf",
    ];
    if BLOCKED.contains(&ext.as_str()) {
        return false;
    }

    // Everything else (including unknown extensions) is allowed so users can open arbitrary text/code files.
    true
}

fn unique_dest(dest: PathBuf) -> PathBuf {
    if !dest.exists() {
        return dest;
    }
    let stem = dest
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("file")
        .to_string();
    let ext = dest
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| format!(".{s}"))
        .unwrap_or_default();
    let parent = dest
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| PathBuf::from("."));
    let mut i = 1usize;
    loop {
        let candidate = parent.join(format!("{stem} ({i}){ext}"));
        if !candidate.exists() {
            return candidate;
        }
        i += 1;
    }
}

fn files_equal(a: &Path, b: &Path) -> bool {
    let ma = match fs::metadata(a) {
        Ok(m) => m,
        Err(_) => return false,
    };
    let mb = match fs::metadata(b) {
        Ok(m) => m,
        Err(_) => return false,
    };
    if ma.len() != mb.len() {
        return false;
    }
    let mut fa = match fs::File::open(a) {
        Ok(f) => f,
        Err(_) => return false,
    };
    let mut fb = match fs::File::open(b) {
        Ok(f) => f,
        Err(_) => return false,
    };
    let mut buf_a = [0u8; 8192];
    let mut buf_b = [0u8; 8192];
    loop {
        let ra = match fa.read(&mut buf_a) {
            Ok(n) => n,
            Err(_) => return false,
        };
        let rb = match fb.read(&mut buf_b) {
            Ok(n) => n,
            Err(_) => return false,
        };
        if ra != rb {
            return false;
        }
        if ra == 0 {
            break;
        }
        if buf_a[..ra] != buf_b[..rb] {
            return false;
        }
    }
    true
}

#[tauri::command]
pub async fn import_project(
    root: String,
    src: String,
    copy: Option<bool>,
) -> Result<String, String> {
    let rootp = PathBuf::from(&root);
    let srcp = PathBuf::from(&src);

    if !rootp.is_dir() {
        return Err("workspace root is not a directory".into());
    }
    if !srcp.is_file() {
        return Err("selected import path is not a file".into());
    }
    if !allowed_ext(&srcp) {
        return Err("unsupported file type".into());
    }

    // If already inside workspace, just return as-is.
    if srcp.starts_with(&rootp) {
        return Ok(srcp.to_string_lossy().to_string());
    }

    // Respect user preference: default to not copying external files; copy only when explicitly requested.
    let should_copy = copy.unwrap_or(false);
    if !should_copy {
        return Ok(srcp.to_string_lossy().to_string());
    }

    let fname = srcp.file_name().ok_or("invalid filename")?;
    let dest0 = rootp.join(fname);
    let dest = if dest0.exists() {
        if files_equal(&srcp, &dest0) {
            dest0
        } else {
            unique_dest(dest0)
        }
    } else {
        dest0
    };

    fs::copy(&srcp, &dest).map_err(|e| e.to_string())?;
    Ok(dest.to_string_lossy().to_string())
}

/// Create a new .rpad project with a unique file name and the given title
#[tauri::command]
pub async fn create_rpad_project(dest_dir: String, name: String) -> Result<String, String> {
    let dest = PathBuf::from(&dest_dir);
    if !dest.is_dir() {
        return Err("destination is not a directory".into());
    }
    let base = dest.join(format!("{}.rpad", name));
    let unique = unique_dest(base);
    let path_s = unique.to_string_lossy().to_string();
    // Write empty HTML with title; creates the archive file
    write_rpad_html(path_s.clone(), String::new(), Some(name)).await?;
    Ok(path_s)
}

/// Atomically write plain text to disk to avoid truncated files on crash.
#[tauri::command]
pub async fn write_text_atomic(path: String, contents: String) -> Result<(), String> {
    let p = Path::new(&path);
    let parent = p.parent().ok_or_else(|| "invalid path".to_string())?;
    let mut tmp = parent.join(".rosepad.txt.tmp");
    let mut i = 0usize;
    while tmp.exists() {
        i += 1;
        tmp = parent.join(format!(".rosepad.txt.tmp{}", i));
    }
    {
        let mut f = fs::File::create(&tmp).map_err(|e| e.to_string())?;
        f.write_all(contents.as_bytes()).map_err(|e| e.to_string())?;
        let _ = f.sync_all();
    }
    if let Err(e) = fs::rename(&tmp, p) {
        if p.exists() {
            let _ = fs::remove_file(p);
            fs::rename(&tmp, p).map_err(|e2| e2.to_string())?;
        } else {
            let _ = fs::remove_file(&tmp);
            return Err(e.to_string());
        }
    }
    Ok(())
}

// Analyze a set of changed paths and produce targeted upserts/deletes.
#[tauri::command]
pub async fn analyze_paths(root: String, paths: Vec<String>) -> Result<AnalyzeResultDto, String> {
    let rootp = PathBuf::from(&root);
    let mut projects: Vec<ProjectDto> = Vec::new();
    let mut delete_project_paths: Vec<String> = Vec::new();
    let mut physical_folders: Vec<PhysicalFolderScanDto> = Vec::new();
    let mut delete_physical_folders: Vec<String> = Vec::new();

    for raw in paths {
        let p = PathBuf::from(&raw);
        // If path is inside the workspace root
        let inside = p.starts_with(&rootp) || p == rootp;
        if !inside {
            continue;
        }

        if p.is_file() {
            // File changed: upsert if allowed and exists; otherwise mark deletion for known extensions
            if allowed_ext(&p) {
                if let Ok(md) = fs::metadata(&p) {
                    let ext = p
                        .extension()
                        .and_then(|s| s.to_str())
                        .unwrap_or("")
                        .to_ascii_lowercase();
                    let (kind, ext_out) = detect_kind_ext(&ext);
                    let name = p
                        .file_stem()
                        .and_then(|s| s.to_str())
                        .unwrap_or("")
                        .to_string();
                    let path_s = p.to_string_lossy().to_string();
                    let id = stable_id(&path_s);
                    let mtime = mtime_ms(&md);
                    let size = md.len() as i64;
                    let title = if kind == "rpad" {
                        read_rpad_title(&p)
                    } else {
                        None
                    };

                    // Determine parent_physical_folder only for direct children of a top-level folder under root
                    let parent = p.parent().map(|x| x.to_path_buf());
                    let parent_physical = match parent {
                        Some(pp) if pp != rootp => {
                            // if pp is an immediate child of root
                            match pp.parent() {
                                Some(grand) if grand == rootp => {
                                    Some(pp.to_string_lossy().to_string())
                                }
                                _ => None,
                            }
                        }
                        _ => None,
                    };

                    projects.push(ProjectDto {
                        id,
                        kind: kind.into(),
                        name,
                        path: path_s,
                        ext: ext_out,
                        title,
                        last_modified_ms: mtime,
                        size,
                        parent_physical_folder: parent_physical,
                    });
                } else {
                    // File no longer exists
                    delete_project_paths.push(p.to_string_lossy().to_string());
                }
            }
        } else if p.is_dir() {
            // If this is the workspace root, skip; if this is a direct child of root, treat as a physical folder
            if p == rootp {
                continue;
            }
            let is_top_level = match p.parent() {
                Some(pp) if pp == rootp => true,
                _ => false,
            };
            if is_top_level {
                if p.exists() {
                    let name = p
                        .file_name()
                        .and_then(|s| s.to_str())
                        .unwrap_or("")
                        .to_string();
                    physical_folders.push(PhysicalFolderScanDto {
                        path: p.to_string_lossy().to_string(),
                        name,
                    });
                    // Shallow rescan of files inside this folder
                    if let Ok(children) = fs::read_dir(&p) {
                        for child in children.flatten() {
                            let cp = child.path();
                            if !cp.is_file() {
                                continue;
                            }
                            if !allowed_ext(&cp) {
                                continue;
                            }
                            if let Ok(md) = fs::metadata(&cp) {
                                let ext = cp
                                    .extension()
                                    .and_then(|s| s.to_str())
                                    .unwrap_or("")
                                    .to_ascii_lowercase();
                                let (kind, ext_out) = detect_kind_ext(&ext);
                                let name = cp
                                    .file_stem()
                                    .and_then(|s| s.to_str())
                                    .unwrap_or("")
                                    .to_string();
                                let path_s = cp.to_string_lossy().to_string();
                                let id = stable_id(&path_s);
                                let mtime = mtime_ms(&md);
                                let size = md.len() as i64;
                                let title = if kind == "rpad" {
                                    read_rpad_title(&cp)
                                } else {
                                    None
                                };
                                projects.push(ProjectDto {
                                    id,
                                    kind: kind.into(),
                                    name,
                                    path: path_s,
                                    ext: ext_out,
                                    title,
                                    last_modified_ms: mtime,
                                    size,
                                    parent_physical_folder: Some(p.to_string_lossy().to_string()),
                                });
                            }
                        }
                    }
                } else {
                    // Folder removed
                    delete_physical_folders.push(p.to_string_lossy().to_string());
                }
            }
        } else {
            // Path missing; try basic cleanup
            let s = p.to_string_lossy().to_string();
            delete_project_paths.push(s.clone());
        }
    }

    Ok(AnalyzeResultDto {
        projects,
        delete_project_paths,
        physical_folders,
        delete_physical_folders,
    })
}
