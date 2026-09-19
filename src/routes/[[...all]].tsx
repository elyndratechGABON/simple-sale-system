// Catch-all route for unknown URLs – renders the 404 page.
// This ensures client-side navigation to unknown paths shows the custom NotFoundComponent
// instead of falling back to the prerendered landing page.

import { createFileRoute, Link } from "@tanstack/react-router";
import { NotFoundComponent } from "./__root";

export const Route = createFileRoute("/[[./all]]")({
  component: () => <NotFoundComponent />,
});
