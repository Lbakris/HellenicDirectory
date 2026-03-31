import { Suspense } from "react";
import type { Metadata } from "next";
import ParishSearch from "../../../components/parishes/ParishSearch";

export const metadata: Metadata = {
  title: "Parish Directory | Hellenic Directory of America",
  description: "Search 540+ Greek Orthodox parishes across the United States and Canada.",
};

export default function ParishesPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-4xl text-navy mb-2">Parish Directory</h1>
          <div className="meander-divider my-4" />
          <p className="text-muted-foreground">
            Search Greek Orthodox parishes across the United States and Canada.
          </p>
        </div>
        <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
          <ParishSearch />
        </Suspense>
      </div>
    </div>
  );
}
