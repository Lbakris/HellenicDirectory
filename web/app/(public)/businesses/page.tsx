import { Suspense } from "react";
import type { Metadata } from "next";
import BusinessSearch from "../../../components/businesses/BusinessSearch";

export const metadata: Metadata = {
  title: "Greek Business Directory | Hellenic Directory of America",
  description: "Find and support Greek-owned businesses across the United States and Canada.",
};

export default function BusinessesPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-4xl text-navy mb-2">Greek Business Directory</h1>
          <div className="meander-divider my-4" />
          <p className="text-muted-foreground">
            Discover and support Greek-owned businesses across North America.
          </p>
        </div>
        <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
          <BusinessSearch />
        </Suspense>
      </div>
    </div>
  );
}
