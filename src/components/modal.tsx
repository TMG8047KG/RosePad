import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import style from "../styles/components/modal.module.css";
import ColorPalette from "./colorPalette";
import "../styles/Main.css";
import { useWorkspace } from "../core/workspaceContext";
import { useModalKeydown } from "../hooks/useModalKeydown";

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
};

type CreateProjectProps = BaseProps &
  TextModalCommon & {
    type: "createProject";
    initialName?: string;
    onSubmit: (name: string, dest?: string) => void;
  };

type RenameProjectProps = BaseProps &
  TextModalCommon & {
    type: "renameProject";
    initialName: string;
    onSubmit: (name: string) => void;
  };

type DeleteProjectProps = BaseProps &
  InfoModalProps & {
    type: "deleteProject";
    onSubmit: (name: string) => void;
  };

type CreateFolderProps = BaseProps &
  TextModalCommon & {
    type: "createFolder";
    initialName?: string;
    initialType?: "physical" | "virtual";
    onSubmit: (name: string, folderType: "physical" | "virtual", color?: string) => void;
  };

type ChangelogProps = BaseProps & {
  type: "changelog";
  title?: string;
  content: React.ReactNode;
  buttonLabel?: string;
  onAcknowledge?: () => void;
};

type ChooseCreateProps = BaseProps & {
  type: "chooseCreate";
  title?: string;
  onChoose: (choice: "project" | "folder") => void;
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
  | ChooseCreateProps
  | CustomProps;

// Allow human-friendly names; forbid only filesystem-invalid characters.
// Disallow control chars and \/:*?"<>| and leading/trailing spaces.
const nameOk = (s: string) => {
  if (!s) return false;
  const trimmed = s.trim();
  if (!trimmed) return false;
  if (/[\\/:*?"<>|]/.test(trimmed)) return false;
  if (/^\.+$/.test(trimmed) || /\.$/.test(trimmed)) return false;
  return true;
};

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

  useEffect(() => setName(initial), [initial]);

  const submit = () => {
    const value = name.trim();
    if (nameOk(value)) {
      onSubmit(value);
      setError("");
    } else {
      setError("A valid name is required! (Allowed: letters, numbers, _, -)");
    }
  };

  useModalKeydown({ onClose, onEnter: submit });

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

  useEffect(() => setName(initial), [initial]);
  useEffect(() => {
    if (rootPath) setDest(rootPath);
  }, [rootPath]);

  const submit = () => {
    const value = name.trim();
    if (!nameOk(value)) {
      setError('Invalid name. Avoid \\/:*?"<>| and trailing dots.');
      return;
    }
    onSubmit(value, dest || undefined);
    setError("");
  };

  useModalKeydown({ onClose, onEnter: submit });

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
          <label className={style.label} htmlFor="dest">
            Folder
          </label>
          <select
            id="dest"
            className={style.select}
            value={dest}
            onChange={(e) => setDest((e.target as HTMLSelectElement).value)}
          >
            {rootPath ? <option value={rootPath}>Root</option> : null}
            {tree?.physicalFolders.map((f) => (
              <option key={f.id} value={f.path}>
                {f.name}
              </option>
            ))}
            {tree?.virtualFolders.length ? <option disabled>— Virtual Folders —</option> : null}
            {tree?.virtualFolders.map((v) => (
              <option key={v.id} value={`vf:${v.id}`}>
                {v.name} (virtual)
              </option>
            ))}
          </select>
        </>
      ) : null}
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

// Palette used by ColorPalette's default; keep in sync with component defaults
const PALETTE_DEFAULTS = [
  "#F43F5E",
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#FDE047",
  "#A3E635",
  "#22C55E",
  "#10B981",
  "#14B8A6",
  "#06B6D4",
  "#0EA5E9",
  "#3B82F6",
  "#8B5CF6",
  "#A855F7",
  "#EC4899",
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
  initialType?: "physical" | "virtual";
  onSubmit: (name: string, folderType: "physical" | "virtual", color?: string) => void;
  onClose: () => void;
}> = ({ title, initial, placeholder, buttonLabel, initialType, onSubmit, onClose }) => {
  const { tree } = useWorkspace();
  const [name, setName] = useState(initial);
  const [error, setError] = useState("");
  const [folderType, setFolderType] = useState<"physical" | "virtual">(initialType ?? "physical");
  const [color, setColor] = useState<string>(randomPaletteColor());

  useEffect(() => setName(initial), [initial]);
  useEffect(() => {
    if (initialType) setFolderType(initialType);
  }, [initialType]);

  const submit = () => {
    const value = name.trim();
    if (!nameOk(value)) {
      setError('Invalid name. Avoid \\/:*?"<>| and trailing dots.');
      return;
    }
    if (tree) {
      if (folderType === "physical") {
        const exists = tree.physicalFolders.some(
          (f) => (f.name || "").toLowerCase() === value.toLowerCase()
        );
        if (exists) {
          setError("A physical folder with this name already exists.");
          return;
        }
      } else {
        const exists = tree.virtualFolders.some(
          (f) => (f.name || "").toLowerCase() === value.toLowerCase()
        );
        if (exists) {
          setError("A virtual folder with this name already exists.");
          return;
        }
      }
    }
    onSubmit(value, folderType, color);
    setError("");
  };

  useModalKeydown({ onClose, onEnter: submit });

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
      <label className={style.label} htmlFor="folderType">
        Folder Type
      </label>
      <select
        id="folderType"
        className={style.select}
        value={folderType}
        onChange={(e) => setFolderType((e.target as HTMLSelectElement).value as "physical" | "virtual")}
      >
        <option value="physical">Physical</option>
        <option value="virtual">Virtual</option>
      </select>
      <label className={style.label} htmlFor="folderColor">
        Color
      </label>
      <div className={style.centerRow}>
        <ColorPalette value={color} onChange={setColor} renderAs="panel" />
      </div>
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

const InfoView: React.FC<{
  title?: string;
  info: string;
  agreeButtonLabel?: string;
  declineButtonLabel?: string;
  onSubmit?: (...props: any) => void;
  onAcknowledge?: () => void;
  onClose: () => void;
}> = ({ title, info, agreeButtonLabel, declineButtonLabel, onSubmit, onAcknowledge, onClose }) => {
  useModalKeydown({ onClose });

  const agreeText = agreeButtonLabel ?? "Ok";
  const declineText = declineButtonLabel ?? "Cancel";
  const showDecline = declineButtonLabel !== "";

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
        {agreeText ? (
          <button className={style.button} onClick={ack}>
            {agreeText}
          </button>
        ) : null}
        {showDecline ? (
          <button className={style.button} onClick={() => onClose()}>
            {declineText}
          </button>
        ) : null}
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
  useModalKeydown({ onClose });

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
  useModalKeydown({ onClose, onEnter: primaryAction?.onClick });

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

const ChooseCreateView: React.FC<{
  title: string;
  onChoose: (choice: "project" | "folder") => void;
  onClose: () => void;
}> = ({ title, onChoose, onClose }) => {
  useModalKeydown({ onClose });

  return (
    <div className={style.modal}>
      <h2>{title}</h2>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button className={style.button} onClick={() => onChoose("project")}>
          Project
        </button>
        <button className={style.button} onClick={() => onChoose("folder")}>
          Folder
        </button>
      </div>
      <div className={style.modalActions}>
        <button className={style.button} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

const MultiModal: React.FC<MultiModalProps> = (props) => {
  if (!props.isOpen) return null;
  const { onClose } = props;

  const overlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  let resolved: React.ReactNode = null;

  switch (props.type) {
    case "createProject":
      resolved = (
        <CreateProjectView
          title={props.title ?? "Create Project"}
          initial={props.initialName ?? ""}
          placeholder={props.placeholder ?? "Enter project name"}
          buttonLabel={props.buttonLabel ?? "Create"}
          onSubmit={props.onSubmit}
          onClose={onClose}
        />
      );
      break;
    case "renameProject":
      resolved = (
        <TextEntryView
          title={props.title ?? "Rename Project"}
          initial={props.initialName}
          placeholder={props.placeholder ?? "Enter new name"}
          buttonLabel={props.buttonLabel ?? "Rename"}
          onSubmit={props.onSubmit}
          onClose={onClose}
        />
      );
      break;
    case "deleteProject":
      resolved = (
        <InfoView
          title={props.title ?? "Delete Project"}
          info={props.info}
          agreeButtonLabel={props.acceptButtonLabel ?? "Ok"}
          declineButtonLabel={props.declineButtonLabel}
          onSubmit={props.onSubmit}
          onClose={onClose}
        />
      );
      break;
    case "createFolder":
      resolved = (
        <CreateFolderView
          title={props.title ?? "New Folder"}
          initial={props.initialName ?? ""}
          placeholder={props.placeholder ?? "Enter folder name"}
          buttonLabel={props.buttonLabel ?? "Create"}
          initialType={props.initialType}
          onSubmit={props.onSubmit}
          onClose={onClose}
        />
      );
      break;
    case "changelog":
      resolved = (
        <ChangelogView
          title={props.title ?? "What's new"}
          content={props.content}
          buttonLabel={props.buttonLabel ?? "Got it"}
          onAcknowledge={props.onAcknowledge}
          onClose={onClose}
        />
      );
      break;
    case "custom":
      resolved = (
        <CustomView
          title={props.title}
          primaryAction={props.primaryAction}
          secondaryAction={props.secondaryAction}
          onClose={onClose}
        >
          {props.children}
        </CustomView>
      );
      break;
    case "chooseCreate":
      resolved = (
        <ChooseCreateView title={props.title ?? "Create"} onChoose={props.onChoose} onClose={onClose} />
      );
      break;
    default:
      resolved = null;
  }

  if (!resolved) return null;

  return createPortal(
    <div className={style.modalOverlay} onClick={overlayClick}>
      {resolved}
    </div>,
    document.body
  );
};

export default MultiModal;
