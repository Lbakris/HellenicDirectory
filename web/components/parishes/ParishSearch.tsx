"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api-client";
import type { PaginatedParishes } from "../../../shared/src/types/parish";

export default function ParishSearch() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [state, setState] = useState(searchParams.get("state") ?? "");
  const [page, setPage] = useState(Number(searchParams.get("page") ?? 1));

  const queryKey = ["parishes", { search, state, page }];

  const { data, isLoading, error } = useQuery<PaginatedParishes>({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (state) params.set("state", state);
      params.set("page", String(page));
      return api.get(`/parishes?${params}`);
    },
  });

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setPage(1);
    },
    []
  );

  return (
    <div>
      {/* Search form */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search parishes, clergy, city..."
          className="flex-1 border border-input bg-card rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="text"
          value={state}
          onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
          placeholder="State (NY)"
          className="w-32 border border-input bg-card rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring uppercase"
          maxLength={2}
        />
        <button
          type="submit"
          className="bg-gold text-navy px-6 py-2 rounded text-sm font-medium hover:bg-gold-400 transition-colors"
        >
          Search
        </button>
      </form>

      {/* Results */}
      {isLoading && <div className="text-muted-foreground text-sm py-8 text-center">Loading parishes...</div>}
      {error && <div className="text-destructive text-sm py-4">Failed to load parishes.</div>}

      {data && (
        <>
          <p className="text-muted-foreground text-sm mb-4">
            {data.meta.total.toLocaleString()} parish{data.meta.total !== 1 ? "es" : ""} found
          </p>

          <div className="space-y-3">
            {data.data.map((parish) => (
              <Link
                key={parish.id}
                href={`/parishes/${parish.id}`}
                className="block bg-card border border-border rounded-lg p-4 hover:border-gold/40 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-serif text-navy text-lg group-hover:text-gold transition-colors">
                      {parish.name}
                    </h2>
                    {(parish.city || parish.state) && (
                      <p className="text-muted-foreground text-sm mt-1">
                        {[parish.city, parish.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                  <span className="text-gold/60 text-sm shrink-0">View →</span>
                </div>
                {parish.phone && (
                  <p className="text-muted-foreground text-xs mt-2">{parish.phone}</p>
                )}
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {data.meta.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-border rounded text-sm disabled:opacity-40 hover:border-gold/40"
              >
                Previous
              </button>
              <span className="text-muted-foreground text-sm">
                Page {page} of {data.meta.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.meta.pages, p + 1))}
                disabled={page === data.meta.pages}
                className="px-4 py-2 border border-border rounded text-sm disabled:opacity-40 hover:border-gold/40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
