"use client";

import { useRef } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/lib/utils";

interface ResizeHandleProps {
  orientation: "colonne" | "ligne";
  valeur: number;
  onChange: (valeur: number) => void;
  onReset: () => void;
  ariaLabel: string;
  className?: string;
}

/**
 * Poignée de glisser-déposer pour redimensionner une colonne (bordure
 * droite d'un <th>) ou une ligne (bordure basse d'une <tr>). Le
 * positionnement (absolute, sur quel bord) est laissé au consommateur via
 * className — ce composant ne gère que l'interaction.
 *
 * Souris/tactile : glisser pour redimensionner, double-clic pour
 * réinitialiser. Clavier : flèches pour ajuster par pas, Maj+flèche pour un
 * pas plus large, Entrée/Espace pour réinitialiser — la poignée est un
 * <div role="separator"> focusable, sans dépendance à une librairie tierce.
 */
export function ResizeHandle({
  orientation,
  valeur,
  onChange,
  onReset,
  ariaLabel,
  className,
}: ResizeHandleProps) {
  // Capturés au pointerdown : la valeur de départ et la position du
  // pointeur, pour calculer un delta absolu plutôt que d'accumuler des
  // deltas relatifs (qui dériveraient si un rendu est manqué).
  const depart = useRef<{ position: number; valeur: number } | null>(null);

  function positionPointeur(e: { clientX: number; clientY: number }) {
    return orientation === "colonne" ? e.clientX : e.clientY;
  }

  function onPointerDown(e: ReactPointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    depart.current = { position: positionPointeur(e), valeur };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  function onPointerMove(e: PointerEvent) {
    if (!depart.current) return;
    const delta = positionPointeur(e) - depart.current.position;
    onChange(depart.current.valeur + delta);
  }

  function onPointerUp() {
    depart.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }

  function onKeyDown(e: ReactKeyboardEvent) {
    const pas = e.shiftKey ? 20 : 4;
    const toucheDiminue = orientation === "colonne" ? "ArrowLeft" : "ArrowUp";
    const toucheAugmente = orientation === "colonne" ? "ArrowRight" : "ArrowDown";
    if (e.key === toucheDiminue) {
      e.preventDefault();
      onChange(valeur - pas);
    } else if (e.key === toucheAugmente) {
      e.preventDefault();
      onChange(valeur + pas);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onReset();
    }
  }

  return (
    <div
      role="separator"
      aria-orientation={orientation === "colonne" ? "vertical" : "horizontal"}
      aria-label={ariaLabel}
      title="Glisser pour redimensionner — double-clic pour réinitialiser"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onReset();
      }}
      onKeyDown={onKeyDown}
      className={cn(
        "touch-none select-none hover:bg-indigo-300/70 focus-visible:bg-indigo-400 focus-visible:outline-none",
        orientation === "colonne" ? "cursor-col-resize" : "cursor-row-resize",
        className
      )}
    />
  );
}
