// Ambient declarations for GNOME Shell extension-context globals that
// @girs/gnome-shell/ambient does not expose. These are the ones our
// extension actually uses; add more here if new usage is introduced.

declare global {
    // Shell's top-level `global` object (St/Clutter stage, window manager,
    // workspace manager, etc.). Upstream @girs does not surface a precise
    // type at ambient scope.
    const global: any;

    // Legacy structured log object; new code should use console.*.
    const log: any;

    // GNOME logging helper (still used in some extensions).
    const logError: (e: Error | string, msg?: string) => void;
}

export {};
