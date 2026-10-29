export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      /* Page autonome (le bundle CSS n'est pas chargé) : palette appliquée en oklch,
         calquée sur le thème de l'application (--bg/--text/--muted/--border). */
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: oklch(0.982 0.005 155); color: oklch(0.24 0.02 160); display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: oklch(0.53 0.02 160); margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: oklch(0.24 0.02 160); color: oklch(0.99 0.005 155); }
      .secondary { background: oklch(0.999 0 155); color: oklch(0.24 0.02 160); border-color: oklch(0.916 0.012 155); }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
