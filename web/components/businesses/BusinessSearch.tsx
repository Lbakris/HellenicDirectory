"use client";

import { useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api-client";
import type { PaginatedBusinesses } from "../../../shared/src/types/business";

export default function BusinessSearch() {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<PaginatedBusinesses>({
    queryKey: ["businesses", { search, city, keyword, page }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (city) params.set("city", city);
      if (keyword) params.set("keyword", keyword);
      params.set("page", String(page));
      return api.get(`/businesses?${params}`);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search businesses..."
          className="flex-1 border border-input bg-card rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          className="w-40 border border-input bg-card rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Category/keyword"
          className="w-44 border border-input bg-card rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button type="submit" className="bg-gold text-navy px-6 py-2 rounded text-sm font-medium hover:bg-gold-400 transition-colors">
          Search
        </button>
      </form>

      {isLoading && <div className="text-muted-foreground text-sm py-8 text-center">Loading...</div>}

      {data && (
        <>
          <p className="text-muted-foreground text-sm mb-4">
            {data.meta.total.toLocaleString()} listing{data.meta.total !== 1 ? "s" : ""} found
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {data.data.map((biz) => (
              <div key={biz.id} className="bg-card border border-border rounded-lg p-5 hover:border-gold/40 transition-colors">
                <div className="flex items-start gap-3 mb-3">
                  {biz.logoUrl ? (
                    <Image
                      src={biz.logoUrl}
                      alt={`${biz.businessName} logo`}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded object-contain border border-border"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-navy/10 flex items-center justify-center text-navy font-bold text-lg shrink-0">
                      {biz.businessName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h2 className="font-serif text-navy text-lg">{biz.businessName}</h2>
                    <p className="text-muted-foreground text-xs">{biz.contactName}</p>
                  </div>
                </div>

                {biz.description && (
                  <p className="text-foreground/80 text-sm mb-3 line-clamp-2">{biz.description}</p>
                )}

                <div className="flex flex-wrap gap-1 mb-3">
                  {biz.keywords.slice(0, 4).map((kw) => (
                    <span key={kw} className="bg-gold/10 text-gold-700 border border-gold/20 rounded-full px-2 py-0.5 text-xs">{kw}</span>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{[biz.city, biz.state].filter(Boolean).join(", ")}</span>
                  <div className="flex gap-2 ml-auto">
                    <a href={`tel:${biz.phone}`} className="text-gold hover:underline">Call</a>
                    <a href={`mailto:${biz.email}`} className="text-gold hover:underline">Email</a>
                    {biz.website && <a href={biz.website} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">Website</a>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {data.meta.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-4 py-2 border border-border rounded text-sm disabled:opacity-40 hover:border-gold/40">Previous</button>
              <span className="text-muted-foreground text-sm">Page {page} of {data.meta.pages}</span>
              <button onClick={() => setPage((p) => Math.min(data.meta.pages, p + 1))} disabled={page === data.meta.pages}
                className="px-4 py-2 border border-border rounded text-sm disabled:opacity-40 hover:border-gold/40">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
