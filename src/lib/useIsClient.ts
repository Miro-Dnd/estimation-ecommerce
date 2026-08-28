"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Vrai uniquement après l'hydratation côté client. Utilisé pour différer le
 * montage de fonctionnalités qui ne peuvent pas être rendues de façon
 * identique côté serveur et côté client (ex. identifiants internes générés
 * par une librairie tierce comme dnd-kit).
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
