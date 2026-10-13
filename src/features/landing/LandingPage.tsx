import { Features } from "./Features";
import { FinalCall } from "./FinalCall";
import { Footer } from "./Footer";
import { Hero } from "./Hero";
import { LandingHeader } from "./LandingHeader";
import { Pricing } from "./Pricing";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      <main>
        <Hero />
        <Features />
        <Pricing />
        <FinalCall />
      </main>
      <Footer />
    </div>
  );
}
