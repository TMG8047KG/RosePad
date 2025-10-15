import React, { useEffect, useMemo, useRef, useState } from "react";
import style from "../../styles/components/home/modal.module.css";
import ColorPalette from "../colorPalette";
import "../../styles/Main.css";
import { useWorkspace } from "../../core/workspaceContext";

type BaseProps = {
  isOpen: boolean;
  onClose: () => void;
};

type TextModalCommon = {
  title?: string;
  placeholder?: string;
  buttonLabel?: string;
};

type InfoModalProps = {
  title?: string;
  info: string;
  acceptButtonLabel?: string;
  declineButtonLabel?: string;
}

type CreateProjectProps = BaseProps & TextModalCommon & {
  type: "createProject";
  initialName?: string;
  onSubmit: (name: string, dest?: string) => void;
};

type RenameProjectProps = BaseProps & TextModalCommon & {
  type: "renameProject";
  initialName: string;
  onSubmit: (name: string) => void;
};

type DeleteProjectProps = BaseProps & InfoModalProps & {
  type: "deleteProject";
  onSubmit: (name: string) => void;
}

type CreateFolderProps = BaseProps & TextModalCommon & {
  type: "createFolder";
  initialName?: string;
  onSubmit: (name: string, folderType: 'physical'|'virtual', color?: string) => void;
};

type ChangelogProps = BaseProps & {
  type: "changelog";
  title?: string;
  content: React.ReactNode;
  buttonLabel?: string;
  onAcknowledge?: () => void;
};

type CustomProps = BaseProps & {
  type: "custom";
  title?: string;
  children: React.ReactNode;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
};

export type MultiModalProps =
  | CreateProjectProps
  | RenameProjectProps
  | DeleteProjectProps
  | CreateFolderProps
  | ChangelogProps
  | CustomProps;

// Allow human-friendly names; forbid only filesystem-invalid characters.
// Disallow control chars and \/:*?"<>| and leading/trailing spaces.
const nameOk = (s: string) => {
  if (!s) return false;
  const trimmed = s.trim();
  if (!trimmed) return false;
  // No reserved characters for filenames
  if (/[\\\/:*?"<>|]/.test(trimmed)) return false;
  // Avoid all-dots or dots at end
  if (/^\.+$/.test(trimmed)) return false;
  if (/\.$/.test(trimmed)) return false;
  return true;
}

const TextEntryView: React.FC<{
  title: string;
  initial: string;
  placeholder: string;
  buttonLabel: string;
  onSubmit: (name: string) => void;
  onClose: () => void;
}> = ({ title, initial, placeholder, buttonLabel, onSubmit, onClose }) => {
  const [name, setName] = useState(initial);
  const [error, setError] = useState("");
  const latest = useRef(name);

  useEffect(() => {
    setName(initial);
    latest.current = initial;
  }, [initial]);

  useEffect(() => {
    latest.current = name;
  }, [name]);

  const submit = () => {
    const v = latest.current.trim();
    if (nameOk(v)) {
      onSubmit(v);
      setError("");
    } else {
      setError("A valid name is required! (Allowed: a-z, A-Z, 0-9, _, -)");
    }
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter") submit();
  };

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={style.modal}>
      <h2>{title}</h2>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={placeholder}
        className={style.input}
        autoFocus
      />
      {error && <div className={style.error}>{error}</div>}
      <div className={style.modalActions}>
        <button className={style.button} onClick={submit}>
          {buttonLabel}
        </button>
        <button className={style.button} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
};

const CreateProjectView: React.FC<{
  title: string;
  initial: string;
  placeholder: string;
  buttonLabel: string;
  onSubmit: (name: string, dest?: string) => void;
  onClose: () => void;
}> = ({ title, initial, placeholder, buttonLabel, onSubmit, onClose }) => {
  const { rootPath, tree } = useWorkspace();
  const [name, setName] = useState(initial);
  const [error, setError] = useState("");
  const [dest, setDest] = useState<string>(rootPath ?? "");
  const latestName = useRef(name);
  const latestDest = useRef(dest);

  useEffect(() => { setName(initial) }, [initial])
  useEffect(() => { if (rootPath) setDest(rootPath) }, [rootPath])
  useEffect(() => { latestName.current = name }, [name])
  useEffect(() => { latestDest.current = dest }, [dest])

  const submit = () => {
    const v = latestName.current.trim();
    if (!nameOk(v)) {
      setError('Invalid name. Avoid \\/:*?"<>| and trailing dots.');
      return;
    }
    // Allow duplicate display names; backend will create a unique file name if needed
    onSubmit(v, latestDest.current || undefined);
    setError("");
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter") { e.preventDefault?.(); submit(); }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e)
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const hasWorkspace = !!rootPath && !!tree;

  return (
    <div className={style.modal}>
      <h2>{title}</h2>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={placeholder}
        className={style.input}
        autoFocus
      />
      {hasWorkspace ? (
        <>
          <label className={style.label} htmlFor="dest">Folder</label>
          <select id="dest" className={style.select} value={dest} onChange={(e) => setDest((e.target as HTMLSelectElement).value)}>
            {rootPath ? <option value={rootPath}>Root</option> : null}
            {tree?.physicalFolders.map(f => (
              <option key={f.id} value={f.path}>{f.name}</option>
            ))}
            {tree?.virtualFolders.length ? <option disabled>── Virtual Folders ──</option> : null}
            {tree?.virtualFolders.map(v => (
              <option key={v.id} value={`vf:${v.id}`}>{v.name} (virtual)</option>
            ))}
          </select>
        </>
      ) : null}
      {error && <div className={style.error}>{error}</div>}
      <div className={style.modalActions}>
        <button className={style.button} onClick={submit}>
          {buttonLabel}
        </button>
        <button className={style.button} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
};

function cssVarToHex(name: string): string | null {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!v) return null;
  if (v.startsWith('#')) return v;
  // rgb or rgba -> hex
  const m = v.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!m) return null;
  const r = parseInt(m[1], 10), g = parseInt(m[2], 10), b = parseInt(m[3], 10);
  const toHex = (n:number) => n.toString(16).padStart(2,'0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Palette used by ColorPalette's default; keep in sync with component defaults
const PALETTE_DEFAULTS = [
  '#F43F5E', '#EF4444', '#F97316', '#F59E0B', '#FDE047',
  '#A3E635', '#22C55E', '#10B981', '#14B8A6', '#06B6D4',
  '#0EA5E9', '#3B82F6', '#8B5CF6', '#A855F7', '#EC4899'
];

function randomPaletteColor(): string {
  const i = Math.floor(Math.random() * PALETTE_DEFAULTS.length);
  return PALETTE_DEFAULTS[i];
}

const CreateFolderView: React.FC<{
  title: string;
  initial: string;
  placeholder: string;
  buttonLabel: string;
  onSubmit: (name: string, folderType: 'physical'|'virtual', color?: string) => void;
  onClose: () => void;
}> = ({ title, initial, placeholder, buttonLabel, onSubmit, onClose }) => {
  const { tree } = useWorkspace();
  const [name, setName] = useState(initial);
  const [error, setError] = useState("");
  const [folderType, setFolderType] = useState<'physical'|'virtual'>('physical');
  const [color, setColor] = useState<string>(randomPaletteColor());
  const latestName = useRef(name);
  const latestType = useRef<'physical'|'virtual'>(folderType);
  const latestColor = useRef<string>(color);
  const latestTree = useRef<typeof tree>(tree);

  useEffect(() => { setName(initial) }, [initial])
  // When opened anew, seed a random color from the palette
  useEffect(() => { setColor(randomPaletteColor()) }, [])
  useEffect(() => { latestName.current = name }, [name])
  useEffect(() => { latestType.current = folderType }, [folderType])
  useEffect(() => { latestColor.current = color }, [color])
  useEffect(() => { latestTree.current = tree }, [tree])

  const submit = () => {
    const v = latestName.current.trim();
    const ft = latestType.current;
    const c = latestColor.current;
    const t = latestTree.current;
    if (!nameOk(v)) {
      setError('Invalid name. Avoid \\/:*?"<>| and trailing dots.');
      return;
    }
    // Duplicate check among existing folders by type
    if (t) {
      if (ft === 'physical') {
        const exists = t.physicalFolders.some(f => (f.name || '').toLowerCase() === v.toLowerCase());
        if (exists) { setError('A physical folder with this name already exists.'); return; }
      } else {
        const exists = t.virtualFolders.some(f => (f.name || '').toLowerCase() === v.toLowerCase());
        if (exists) { setError('A virtual folder with this name already exists.'); return; }
      }
    }
    onSubmit(v, ft, c);
    setError("");
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter") { e.preventDefault?.(); submit(); }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e)
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className={style.modal}>
      <h2>{title}</h2>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={placeholder}
        className={style.input}
        autoFocus
      />
      <label className={style.label} htmlFor="folderType">Folder Type</label>
      <select id="folderType" className={style.select} value={folderType} onChange={(e) => setFolderType(((e.target as HTMLSelectElement).value as 'physical'|'virtual'))}>
        <option value="physical">Physical</option>
        <option value="virtual">Virtual</option>
      </select>
      <label className={style.label} htmlFor="folderColor">Color</label>
      <ColorPalette value={color} onChange={setColor} />
      {error && <div className={style.error}>{error}</div>}
      <div className={style.modalActions}>
        <button className={style.button} onClick={submit}>
          {buttonLabel}
        </button>
        <button className={style.button} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
};

const InfoView: React.FC<{
  title?: string;
  info: string;
  agreeButtonLabel?: string;
  declineButtonLabel?: string;
  onSubmit?: (...props:any) => void;
  onAcknowledge?: () => void;
  onClose: () => void;
}> = ({ title, info, agreeButtonLabel, declineButtonLabel, onSubmit, onAcknowledge, onClose }) => {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ack = () => {
    onSubmit?.();
    onAcknowledge?.();
    onClose();
  };

  return (
    <div className={style.modal}>
      <h2>{title}</h2>
      <div className={style.content}>{info}</div>
      <div className={style.modalActions}>
        <button className={style.button} onClick={() => onClose()}>
          {declineButtonLabel}
        </button>
        <button className={style.button} onClick={ack}>
          {agreeButtonLabel}
        </button>
      </div>
    </div>
  );
};

const ChangelogView: React.FC<{
  title: string;
  content: React.ReactNode;
  buttonLabel: string;
  onAcknowledge?: () => void;
  onClose: () => void;
}> = ({ title, content, buttonLabel, onAcknowledge, onClose }) => {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ack = () => {
    onAcknowledge?.();
    onClose();
  };

  return (
    <div className={style.modal}>
      <h2>{title}</h2>
      <div className={style.content}>{content}</div>
      <div className={style.modalActions}>
        <button className={style.button} onClick={ack}>
          {buttonLabel}
        </button>
      </div>
    </div>
  );
};

const CustomView: React.FC<{
  title?: string;
  children: React.ReactNode;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  onClose: () => void;
}> = ({ title, children, primaryAction, secondaryAction, onClose }) => {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={style.modal}>
      {title ? <h2>{title}</h2> : null}
      <div className={style.content}>{children}</div>
      <div className={style.modalActions}>
        {primaryAction ? (
          <button className={style.button} onClick={primaryAction.onClick}>
            {primaryAction.label}
          </button>
        ) : null}
        <button className={style.button} onClick={onClose}>
          {secondaryAction?.label ?? "Close"}
        </button>
      </div>
    </div>
  );
};

const MultiModal: React.FC<MultiModalProps> = (props) => {
  const { isOpen, onClose } = props;

  const overlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const resolved = useMemo(() => {
    if (!isOpen) return null;
    switch (props.type) {
      case "createProject":
        return (
          <CreateProjectView
            title={props.title ?? "Create Project"}
            initial={props.initialName ?? ""}
            placeholder={props.placeholder ?? "Enter project name"}
            buttonLabel={props.buttonLabel ?? "Create"}
            onSubmit={props.onSubmit}
            onClose={onClose}
          />
        );
      case "renameProject":
        return (
          <TextEntryView
            title={props.title ?? "Rename Project"}
            initial={props.initialName}
            placeholder={props.placeholder ?? "Enter new name"}
            buttonLabel={props.buttonLabel ?? "Rename"}
            onSubmit={props.onSubmit}
            onClose={onClose}
          />
        );
      case "deleteProject":
        return (
          <InfoView
            title={props.title ?? "Delete Project"}
            info={props.info}
            agreeButtonLabel={props.acceptButtonLabel ?? "Ok"}
            declineButtonLabel={props.declineButtonLabel ?? ""}
            onSubmit={props.onSubmit}
            onClose={onClose}
          />
        );
      case "createFolder":
        return (
          <CreateFolderView
            title={props.title ?? "New Folder"}
            initial={props.initialName ?? ""}
            placeholder={props.placeholder ?? "Enter folder name"}
            buttonLabel={props.buttonLabel ?? "Create"}
            onSubmit={props.onSubmit}
            onClose={onClose}
          />
        );
      case "changelog":
        return (
          <ChangelogView
            title={props.title ?? "What’s new"}
            content={props.content}
            buttonLabel={props.buttonLabel ?? "Got it"}
            onAcknowledge={props.onAcknowledge}
            onClose={onClose}
          />
        );
      case "custom":
        return (
          <CustomView
            title={props.title}
            primaryAction={props.primaryAction}
            secondaryAction={props.secondaryAction}
            onClose={onClose}
          >
            {props.children}
          </CustomView>
        );
      default:
        return null;
    }
  }, [isOpen, props, onClose]);

  if (!isOpen) return null;

  return (
    <div className={style.modalOverlay} onClick={overlayClick}>
      {resolved}
    </div>
  );
};

export default MultiModal;
