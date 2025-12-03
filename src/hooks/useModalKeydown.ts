import { useEffect } from "react";
import { useLatest } from "./useLatest";

type ModalKeys = {
  onClose: () => void;
  onEnter?: () => void;
};

/**
 * One lightweight key listener for modal interactions.
 * Uses refs to avoid re-subscribing on every render.
 */
export function useModalKeydown({ onClose, onEnter }: ModalKeys) {
  const latestClose = useLatest(onClose);
  const latestEnter = useLatest(onEnter);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        latestClose.current();
        return;
      }
      if (e.key === "Enter" && latestEnter.current) {
        e.preventDefault?.();
        latestEnter.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [latestClose, latestEnter]);
}
