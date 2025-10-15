use tauri::{AppHandle, Emitter};
use serde::{Serialize, Deserialize};
use zip::{write::FileOptions, ZipArchive, ZipWriter};
use std::{fs, io::{Read, Write}, path::{Path, PathBuf}};
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
#[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
use lazy_static::lazy_static;
#[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
use std::sync::Mutex;

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
  pub parent_physical_folder: Option<String>
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PhysicalFolderScanDto {
  pub path: String,
  pub name: String
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResultDto {
  pub root_projects: Vec<ProjectDto>,
  pub physical_folders: Vec<(PhysicalFolderScanDto, Vec<ProjectDto>)>
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyzeResultDto {
  pub projects: Vec<ProjectDto>,
  pub delete_project_paths: Vec<String>,
  pub physical_folders: Vec<PhysicalFolderScanDto>,
  pub delete_physical_folders: Vec<String>,
}

fn mtime_ms(md: &fs::Metadata) -> i64 {
  use std::time::SystemTime;
  match md.modified() {
    Ok(t) => t.duration_since(SystemTime::UNIX_EPOCH).map(|d| d.as_millis() as i64).unwrap_or(0),
    Err(_) => 0
  }
}

fn read_rpad_title(path: &Path) -> Option<String> {
  let file = fs::File::open(path).ok()?;
  let mut zip = zip::ZipArchive::new(file).ok()?;
  let mut f = zip.by_name("manifest.json").ok()?;
  let mut s = String::new();
  let _ = f.read_to_string(&mut s).ok()?;
  let v: serde_json::Value = serde_json::from_str(&s).ok()?;
  v.get("title").and_then(|t| t.as_str()).map(|s| s.to_string())
}

fn detect_kind_ext(ext: &str) -> (&'static str, Option<String>) {
  match ext {
    "rpad" => ("rpad", None),
    "doc" | "docx" => ("doc", Some("doc".into())),
    "pdf" => ("pdf", Some("pdf".into())),
    "txt" => ("txt", Some("txt".into())),
    _ => ("unknown", Some(ext.into()))
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
    let entry = match entry { Ok(x) => x, Err(_) => continue };
    let p = entry.path();
    let name = entry.file_name().to_string_lossy().to_string();

    if p.is_dir() {
      let mut items: Vec<ProjectDto> = Vec::new();
      if let Ok(children) = fs::read_dir(&p) {
        for child in children {
          let child = match child { Ok(x) => x, Err(_) => continue };
          let cp = child.path();
          if !cp.is_file() { continue; }

          let ext = match cp.extension().and_then(|s| s.to_str()) {
            Some(e) => e.to_lowercase(),
            None => continue,
          };
          if !["rpad","doc","docx","pdf","txt"].contains(&ext.as_str()) { continue; }

          let md = match fs::metadata(&cp) { Ok(m) => m, Err(_) => continue };
          let name = cp.file_stem().and_then(|s| s.to_str()).unwrap_or("").to_string();
          let (kind, ext_out) = detect_kind_ext(&ext);
          let path_s = cp.to_string_lossy().to_string();
          let id = stable_id(&path_s);
          let mtime = mtime_ms(&md);
          let size = md.len() as i64;
          let title = if kind == "rpad" { read_rpad_title(&cp) } else { None };

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
      physical_folders.push((PhysicalFolderScanDto { path: p.to_string_lossy().to_string(), name }, items));
    } else if p.is_file() {
      let ext = match p.extension().and_then(|s| s.to_str()) {
        Some(e) => e.to_lowercase(),
        None => continue,
      };
      if !["rpad","doc","docx","pdf","txt"].contains(&ext.as_str()) { continue; }

      let md = match fs::metadata(&p) { Ok(m) => m, Err(_) => continue };
      let name_s = p.file_stem().and_then(|s| s.to_str()).unwrap_or("").to_string();
      let (kind, ext_out) = detect_kind_ext(&ext);
      let path_s = p.to_string_lossy().to_string();
      let id = stable_id(&path_s);
      let mtime = mtime_ms(&md);
      let size = md.len() as i64;
      let title = if kind == "rpad" { read_rpad_title(&p) } else { None };

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

  Ok(ScanResultDto { root_projects, physical_folders })
}


#[tauri::command]
pub async fn rename_project(_app: AppHandle, old_path: String, new_name: String) -> Result<String, String> {
  let p = PathBuf::from(&old_path);
  if !p.is_file() { return Err("not a file".into()); }
  let ext = p.extension().and_then(|s| s.to_str()).unwrap_or("").to_ascii_lowercase();
  // For .rpad, prefer updating the manifest title and keep the file name as-is (allows duplicate display names)
  if ext == "rpad" {
    // Try to preserve HTML content if present
    let html = match read_rpad_data(old_path.clone()).await {
      Ok(s) => s,
      Err(_) => String::new(),
    };
    // Overwrite the archive with the same path, updating title
    write_rpad_html(old_path.clone(), html, Some(new_name.clone())).await?;
    return Ok(p.to_string_lossy().to_string());
  }

  // For non-rpad files, perform a physical rename but ensure uniqueness
  let parent = p.parent().ok_or_else(|| "no parent".to_string())?;
  let target = if ext.is_empty() { parent.join(&new_name) } else { parent.join(format!("{}.{}", new_name, ext)) };
  let dest = unique_dest(target);
  fs::rename(&p, &dest).map_err(|e| e.to_string())?;
  Ok(dest.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn delete_project(_app: AppHandle, path: String) -> Result<(), String> {
  let _ = fs::remove_file(&path);
  Ok(())
}

#[tauri::command]
pub async fn move_project(_app: AppHandle, old_path: String, dest_dir: String) -> Result<String, String> {
  let src = PathBuf::from(&old_path);
  if !src.is_file() { return Err("not a file".into()); }
  let dest = PathBuf::from(&dest_dir);
  if !dest.is_dir() { return Err("destination is not a directory".into()); }
  let file_name = src.file_name().ok_or_else(|| "invalid source".to_string())?;
  let candidate = dest.join(file_name);
  let new_path = unique_dest(candidate);
  fs::rename(&src, &new_path).map_err(|e| e.to_string())?;
  Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn rename_physical_folder(_app: AppHandle, path: String, new_name: String) -> Result<String, String> {
  let p = PathBuf::from(&path);
  if !p.is_dir() { return Err("not a directory".into()); }
  let parent = p.parent().ok_or_else(|| "no parent".to_string())?;
  let new_path = parent.join(&new_name);
  fs::rename(&p, &new_path).map_err(|e| e.to_string())?;
  Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn delete_physical_folder(_app: AppHandle, path: String) -> Result<(), String> {
  let p = PathBuf::from(&path);
  if !p.is_dir() { return Err("not a directory".into()); }
  fs::remove_dir_all(&p).map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
pub async fn create_physical_folder(_app: AppHandle, root: String, name: String) -> Result<String, String> {
  let r = PathBuf::from(&root);
  if !r.is_dir() { return Err("root is not a directory".into()); }
  let new_path = r.join(&name);
  if new_path.exists() { return Ok(new_path.to_string_lossy().to_string()); }
  fs::create_dir_all(&new_path).map_err(|e| e.to_string())?;
  Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn watch_physical_folders(app: tauri::AppHandle, folders: Vec<String>) -> Result<(), String> {
  let handle = app.clone();

  // Single global watcher instance; replace watched folders on subsequent calls
  #[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
  lazy_static! {
    static ref WATCHER: Mutex<Option<(RecommendedWatcher, Vec<String>)>> = Mutex::new(None);
  }

  #[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
  {
    let mut guard = WATCHER.lock().map_err(|_| "watcher lock poisoned".to_string())?;
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
    let mut watcher: RecommendedWatcher = notify::recommended_watcher(
      move |res: notify::Result<notify::Event>| {
        if let Ok(event) = res {
          let paths: Vec<String> = event
            .paths
            .iter()
            .map(|p| p.to_string_lossy().to_string())
            .collect();
          let _ = handle.emit("fs:changed", paths);
        }
      },
    ).map_err(|e| format!("failed to create file watcher: {e}"))?;

    for f in &folders {
      let _ = watcher.watch(Path::new(&f), RecursiveMode::Recursive);
    }

    *guard = Some((watcher, folders));
    Ok(())
  }

  #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
  {
    // No-op on mobile platforms
    let _ = folders;
    Ok(())
  }
}

#[tauri::command]
pub async fn read_rpad_data(path: String) -> Result<String, String> {
  let p = Path::new(&path);
  let file = fs::File::open(p).map_err(|e| e.to_string())?;
  let mut zip = ZipArchive::new(file).map_err(|e| e.to_string())?;

  // Try common data entries
  for candidate in ["data.json", "content.json", "document.json", "data/data.json"] {
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
pub async fn write_rpad_html(path: String, html: String, title: Option<String>) -> Result<(), String> {
  let p = Path::new(&path);
  let file = fs::File::create(p).map_err(|e| e.to_string())?;
  let mut zip = ZipWriter::new(file);
  let options = FileOptions::default().compression_method(zip::CompressionMethod::Deflated);

  let manifest = serde_json::json!({
    "title": title.unwrap_or_else(|| "Untitled".to_string()),
    "version": 1
  });
  zip.start_file("manifest.json", options).map_err(|e| e.to_string())?;
  zip.write(manifest.to_string().as_bytes()).map_err(|e| e.to_string())?;

  let data = serde_json::json!({ "html": html });
  zip.start_file("data.json", options).map_err(|e| e.to_string())?;
  zip.write(data.to_string().as_bytes()).map_err(|e| e.to_string())?;

  zip.finish().map_err(|e| e.to_string())?;
  Ok(())
}

fn allowed_ext(p: &Path) -> bool {
  match p.extension().and_then(|s| s.to_str()).map(|s| s.to_ascii_lowercase()) {
    Some(ext) if ["rpad","txt","pdf","doc","docx"].contains(&ext.as_str()) => true,
    _ => false
  }
}

fn unique_dest(dest: PathBuf) -> PathBuf {
  if !dest.exists() { return dest; }
  let stem = dest.file_stem().and_then(|s| s.to_str()).unwrap_or("file").to_string();
  let ext = dest.extension().and_then(|s| s.to_str()).map(|s| format!(".{s}")).unwrap_or_default();
  let parent = dest.parent().map(|p| p.to_path_buf()).unwrap_or_else(|| PathBuf::from("."));
  let mut i = 1usize;
  loop {
    let candidate = parent.join(format!("{stem} ({i}){ext}"));
    if !candidate.exists() { return candidate; }
    i += 1;
  }
}

#[tauri::command]
pub async fn import_project(root: String, src: String) -> Result<String, String> {
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

  let fname = srcp.file_name().ok_or("invalid filename")?;
  let dest0 = rootp.join(fname);
  let dest = unique_dest(dest0);

  fs::copy(&srcp, &dest).map_err(|e| e.to_string())?;
  Ok(dest.to_string_lossy().to_string())
}

/// Create a new .rpad project with a unique file name and the given title
#[tauri::command]
pub async fn create_rpad_project(dest_dir: String, name: String) -> Result<String, String> {
  let dest = PathBuf::from(&dest_dir);
  if !dest.is_dir() { return Err("destination is not a directory".into()); }
  let base = dest.join(format!("{}.rpad", name));
  let unique = unique_dest(base);
  let path_s = unique.to_string_lossy().to_string();
  // Write empty HTML with title; creates the archive file
  write_rpad_html(path_s.clone(), String::new(), Some(name)).await?;
  Ok(path_s)
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
    if !inside { continue; }

    if p.is_file() {
      // File changed: upsert if allowed and exists; otherwise mark deletion for known extensions
      if allowed_ext(&p) {
        if let Ok(md) = fs::metadata(&p) {
          let ext = p.extension().and_then(|s| s.to_str()).unwrap_or("").to_ascii_lowercase();
          let (kind, ext_out) = detect_kind_ext(&ext);
          let name = p.file_stem().and_then(|s| s.to_str()).unwrap_or("").to_string();
          let path_s = p.to_string_lossy().to_string();
          let id = stable_id(&path_s);
          let mtime = mtime_ms(&md);
          let size = md.len() as i64;
          let title = if kind == "rpad" { read_rpad_title(&p) } else { None };

          // Determine parent_physical_folder only for direct children of a top-level folder under root
          let parent = p.parent().map(|x| x.to_path_buf());
          let parent_physical = match parent {
            Some(pp) if pp != rootp => {
              // if pp is an immediate child of root
              match pp.parent() { Some(grand) if grand == rootp => Some(pp.to_string_lossy().to_string()), _ => None }
            }
            _ => None
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
      if p == rootp { continue; }
      let is_top_level = match p.parent() { Some(pp) if pp == rootp => true, _ => false };
      if is_top_level {
        if p.exists() {
          let name = p.file_name().and_then(|s| s.to_str()).unwrap_or("").to_string();
          physical_folders.push(PhysicalFolderScanDto { path: p.to_string_lossy().to_string(), name });
          // Shallow rescan of files inside this folder
          if let Ok(children) = fs::read_dir(&p) {
            for child in children.flatten() {
              let cp = child.path();
              if !cp.is_file() { continue; }
              if !allowed_ext(&cp) { continue; }
              if let Ok(md) = fs::metadata(&cp) {
                let ext = cp.extension().and_then(|s| s.to_str()).unwrap_or("").to_ascii_lowercase();
                let (kind, ext_out) = detect_kind_ext(&ext);
                let name = cp.file_stem().and_then(|s| s.to_str()).unwrap_or("").to_string();
                let path_s = cp.to_string_lossy().to_string();
                let id = stable_id(&path_s);
                let mtime = mtime_ms(&md);
                let size = md.len() as i64;
                let title = if kind == "rpad" { read_rpad_title(&cp) } else { None };
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

  Ok(AnalyzeResultDto { projects, delete_project_paths, physical_folders, delete_physical_folders })
}
