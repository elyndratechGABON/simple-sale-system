// Enregistrement des documents générés (exports, sauvegardes) — un seul point d'entrée,
// quatre stratégies choisies à l'exécution selon ce que la plateforme sait faire.
//
// Pourquoi quatre : le File System Access API (`showDirectoryPicker`) est **desktop
// uniquement**. Il n'existe ni sur Chrome Android, ni sur Firefox Android, ni sur Samsung
// Internet, ni sur Safari iOS. Une PWA sur téléphone ne peut donc pas obtenir de dossier
// permanent — d'où le passage par Capacitor pour l'application Android native, et par la
// feuille de partage sinon. Ne pas « simplifier » en supposant que le picker existe partout.
import { Capacitor } from "@capacitor/core";
import { getSetting, setSetting } from "./db";

const DIR_HANDLE_KEY = "documents_dir_handle";

export type SaveMethod = "capacitor" | "directory" | "share" | "download";

export interface SaveResult {
  method: SaveMethod;
  /** Emplacement lisible par un humain, quand il y en a un. */
  location?: string;
}

// `queryPermission` / `requestPermission` sur un FileSystemHandle ne sont pas encore dans
// les types DOM de TypeScript : ils font partie de la spec File System Access, pas de la
// spec File System. Déclaration locale volontairement minimale.
interface PermissionCapableHandle extends FileSystemDirectoryHandle {
  queryPermission?: (d: { mode: "read" | "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (d: { mode: "read" | "readwrite" }) => Promise<PermissionState>;
}

type PickerWindow = Window & {
  showDirectoryPicker?: (o?: { mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandle>;
};

/** Le picker de dossier n'est proposé que là où il existe réellement. */
export function canPickDirectory(): boolean {
  if (typeof window === "undefined") return false;
  if (Capacitor.isNativePlatform()) return false;
  return typeof (window as PickerWindow).showDirectoryPicker === "function";
}

/** Ouvre le sélecteur et mémorise le dossier choisi. Renvoie son nom, ou null si annulé. */
export async function pickDocumentsDirectory(): Promise<string | null> {
  const picker = (window as PickerWindow).showDirectoryPicker;
  if (!picker) return null;
  try {
    const handle = await picker({ mode: "readwrite" });
    await setSetting(DIR_HANDLE_KEY, handle);
    return handle.name;
  } catch {
    return null; // l'utilisateur a fermé le sélecteur
  }
}

export async function getDocumentsDirectoryName(): Promise<string | null> {
  const handle = await getSetting<FileSystemDirectoryHandle>(DIR_HANDLE_KEY);
  return handle?.name ?? null;
}

export async function forgetDocumentsDirectory(): Promise<void> {
  await setSetting(DIR_HANDLE_KEY, undefined);
}

/**
 * Récupère le dossier mémorisé si l'autorisation tient toujours.
 * Les handles sont structured-cloneable, donc persistables dans IndexedDB — mais
 * l'autorisation, elle, doit être revalidée à chaque session.
 */
async function getGrantedDirectory(): Promise<FileSystemDirectoryHandle | null> {
  const handle = (await getSetting<PermissionCapableHandle>(DIR_HANDLE_KEY)) ?? null;
  if (!handle) return null;
  try {
    const state = (await handle.queryPermission?.({ mode: "readwrite" })) ?? "granted";
    if (state === "granted") return handle;
    if (state === "denied") return null;
    const asked = (await handle.requestPermission?.({ mode: "readwrite" })) ?? "denied";
    return asked === "granted" ? handle : null;
  } catch {
    return null;
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  // Par tranches : btoa sur un très gros tableau d'un coup dépasse la taille d'appel.
  const CHUNK = 0x8000;
  for (let i = 0; i < buffer.length; i += CHUNK) {
    binary += String.fromCharCode(...buffer.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export async function saveDocument(blob: Blob, filename: string): Promise<SaveResult> {
  // 1. Application Android native : le seul chemin qui donne un vrai dossier sur mobile.
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const result = await Filesystem.writeFile({
      path: filename,
      data: await blobToBase64(blob),
      directory: Directory.Documents,
      recursive: true,
    });
    return { method: "capacitor", location: result.uri };
  }

  // 2. Dossier choisi par l'utilisateur (Chrome / Edge desktop).
  const dir = await getGrantedDirectory();
  if (dir) {
    const file = await dir.getFileHandle(filename, { create: true });
    const writable = await file.createWritable();
    await writable.write(blob);
    await writable.close();
    return { method: "directory", location: dir.name };
  }

  // 3. Feuille de partage : sur Android c'est ce qui permet d'envoyer vers Drive, Fichiers
  //    ou WhatsApp, faute de dossier accessible.
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return { method: "share" };
    } catch {
      // Partage refusé ou annulé : on retombe sur le téléchargement.
    }
  }

  // 4. Repli universel : dossier Téléchargements.
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { method: "download" };
}

export function describeSaveResult(result: SaveResult, filename: string): string {
  switch (result.method) {
    case "capacitor":
      return `${filename} enregistré dans Documents`;
    case "directory":
      return `${filename} enregistré dans « ${result.location} »`;
    case "share":
      return `${filename} partagé`;
    case "download":
      return `${filename} téléchargé`;
  }
}
