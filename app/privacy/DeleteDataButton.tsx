"use client";

import { useState, useSyncExternalStore } from "react";

import { analytics } from "../analytics";
import {
  clearAnonymousIdentity,
  getOrCreateAnonymousIdentity,
} from "../identity/anonymous-identity";
import styles from "../components/legal/legal-page.module.css";

type DeleteState = "idle" | "confirm" | "deleting" | "deleted" | "error";

const subscribeToHydration = () => () => {};

export function DeleteDataButton() {
  const [state, setState] = useState<DeleteState>("idle");
  const ready = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  const deleteData = async () => {
    if (state === "idle") {
      setState("confirm");
      return;
    }
    if (state !== "confirm") return;
    setState("deleting");
    const identity = getOrCreateAnonymousIdentity();
    try {
      const response = await fetch("/api/progress", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(identity),
      });
      if (!response.ok) throw new Error("Deletion failed");
      clearShortcutHeroLocalData();
      clearAnonymousIdentity();
      analytics.resetIdentity();
      setState("deleted");
    } catch {
      setState("error");
    }
  };

  const label =
    state === "confirm"
      ? "confirm: delete my progress"
      : state === "deleting"
        ? "deleting…"
        : state === "deleted"
          ? "progress deleted"
          : state === "error"
            ? "try deletion again"
            : "delete my saved progress";

  return (
    <>
      <button
        type="button"
        className={styles.deleteButton}
        disabled={!ready || state === "deleting" || state === "deleted"}
        onClick={() => void deleteData()}
      >
        {label}
      </button>
      {state === "confirm" ? (
        <p className={styles.deleteStatus} role="status">
          This removes server progress, your public board entries, settings,
          your local name, and scores. This cannot be undone.
        </p>
      ) : null}
      {state === "deleted" ? (
        <p className={styles.deleteStatus} role="status">
          Your saved progress and device data are gone.
        </p>
      ) : null}
      {state === "error" ? (
        <p className={styles.deleteStatus} role="alert">
          Deletion is unavailable right now. Your deletion key is still saved,
          so you can safely try again.
        </p>
      ) : null}
    </>
  );
}

function clearShortcutHeroLocalData(): void {
  try {
    const keys = Array.from(
      { length: window.localStorage.length },
      (_, index) => window.localStorage.key(index),
    );
    for (const key of keys) {
      if (key?.startsWith("shortcut-hero:")) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // The server record is still deleted if local storage is unavailable.
  }
}
