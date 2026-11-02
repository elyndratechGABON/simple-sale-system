import { useEffect, useState } from "react";

type LogEntry = { id: number; level: "log" | "error"; message: string; at: string };

function formatArgs(args: unknown[]): string {
  return args
    .map((value) => {
      if (typeof value === "string") return value;
      if (value instanceof Error) return `${value.name}: ${value.message}`;
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    })
    .join(" ");
}

export function DebugConsole() {
  const enabled =
    import.meta.env.DEV ||
    (typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("debug") === "1");
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (!enabled) return;

    const originalLog = console.log;
    const originalError = console.error;
    let id = 0;
    const append = (level: LogEntry["level"], args: unknown[]) => {
      const entry = {
        id: ++id,
        level,
        message: formatArgs(args),
        at: new Date().toLocaleTimeString(),
      };
      setLogs((current) => [...current, entry].slice(-20));
    };

    console.log = (...args: unknown[]) => {
      originalLog.apply(console, args);
      append("log", args);
    };
    console.error = (...args: unknown[]) => {
      originalError.apply(console, args);
      append("error", args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir les logs de débogage"
        className="fixed bottom-4 right-4 z-[100] rounded-full bg-red-600 px-3 py-2 text-xs font-bold text-white shadow-lg"
      >
        DEBUG
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[101] flex items-end bg-black/50"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Logs de débogage"
            className="max-h-[75dvh] w-full overflow-hidden rounded-t-2xl bg-background text-foreground shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b p-4">
              <h2 className="font-semibold">Logs récents ({logs.length}/20)</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded border px-3 py-1 text-sm"
                  onClick={() => setLogs([])}
                >
                  Effacer
                </button>
                <button
                  type="button"
                  className="rounded border px-3 py-1 text-sm"
                  onClick={() => setOpen(false)}
                >
                  Fermer
                </button>
              </div>
            </header>
            <div
              className="max-h-[calc(75dvh-64px)] space-y-2 overflow-y-auto p-3 font-mono text-xs"
              aria-live="polite"
            >
              {logs.length === 0 ? (
                <p className="text-muted-foreground">Aucun log capturé depuis l'ouverture.</p>
              ) : (
                logs.map((entry) => (
                  <p
                    key={entry.id}
                    className={entry.level === "error" ? "break-words text-red-600" : "break-words"}
                  >
                    <span className="mr-2 text-muted-foreground">{entry.at}</span>
                    {entry.message}
                  </p>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
