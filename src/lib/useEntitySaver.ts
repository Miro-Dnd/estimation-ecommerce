"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Sauvegarde automatique "façon tableur" : chaque modification met à jour
 * l'UI immédiatement, puis est envoyée au serveur après un court délai sans
 * nouvelle frappe (debounce), fusionnée par clé (par ex. l'id de la ligne)
 * pour ne jamais perdre une modification survenue entre deux sauvegardes.
 */
export function useEntitySaver<T extends object>(
  save: (key: string, patch: Partial<T>) => Promise<void>,
  delay = 600
) {
  const pendingRef = useRef(new Map<string, Partial<T>>());
  const timeoutsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      timeouts.forEach((t) => clearTimeout(t));
    };
  }, []);

  function schedule(key: string, patch: Partial<T>) {
    const merged = { ...(pendingRef.current.get(key) ?? {}), ...patch };
    pendingRef.current.set(key, merged);

    const existing = timeoutsRef.current.get(key);
    if (existing) {
      clearTimeout(existing);
    } else {
      setPendingCount((c) => c + 1);
    }

    const timeout = setTimeout(async () => {
      const toSave = pendingRef.current.get(key);
      pendingRef.current.delete(key);
      timeoutsRef.current.delete(key);
      setPendingCount((c) => Math.max(0, c - 1));
      if (toSave) {
        try {
          await save(key, toSave);
        } catch (error) {
          // Une sauvegarde peut échouer si l'entité a été supprimée entre
          // temps (par ex. l'utilisateur supprime une ligne juste après
          // l'avoir modifiée) : on log sans faire planter l'UI.
          console.error(`Échec de la sauvegarde automatique (${key})`, error);
        }
      }
    }, delay);
    timeoutsRef.current.set(key, timeout);
  }

  /** Annule toute sauvegarde en attente pour cette clé (ex. avant suppression). */
  function cancel(key: string) {
    const existing = timeoutsRef.current.get(key);
    if (existing) {
      clearTimeout(existing);
      timeoutsRef.current.delete(key);
      setPendingCount((c) => Math.max(0, c - 1));
    }
    pendingRef.current.delete(key);
  }

  return { schedule, cancel, isSaving: pendingCount > 0 };
}
