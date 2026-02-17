'use client'

import * as React from 'react'
import { useState } from 'react'

import { Input }     from '@/components/ui/input'
import { Button }    from '@/components/ui/button'
import { Card,
         CardHeader,
         CardTitle,
         CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

/* 👇 your reusable filter component (build it separately) */
import {SearchFilters}  from '@/components/ui/search/searchfilter'

export default function AdvancedSearchPage() {
  const [query, setQuery] = useState<string>('')

  /*  ───────────────────────────────────────────
      You can replace this later with real data
  ─────────────────────────────────────────────*/
  const results: never[] = []   // always empty (spec requirement)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: call your search API / mutation here
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 space-y-8">
      {/* Page Heading */}
      <header className="space-y-1.5">
        <h1 className="text-3xl font-semibold tracking-tight">
          Advanced Search
        </h1>
        <p className="text-muted-foreground">
          Search documents using advanced filters and criteria
        </p>
      </header>

      {/* Search-Filters Card (delegated to separate component) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-primary"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707l-6.414 6.415A1 1 0 0014 13v4l-4 2v-6a1 1 0 00-.293-.707L3.293 6.707A1 1 0 013 6V4z"
              />
            </svg>
            Search Filters
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* 🔍 main query input */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              placeholder="Enter keywords, document content, or metadata…"
              className="w-full"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            {/* 🛠 additional filters */}
            <SearchFilters />

            {/* action buttons */}
            <div className="flex flex-wrap gap-3">
              <Button type="submit">Search</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuery('')}
              >
                Clear Filters
              </Button>
              <Button type="button" variant="secondary">
                Save Search
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Search-Results Card */}
      <Card>
        <CardHeader>
          <CardTitle>Search Results</CardTitle>
        </CardHeader>

        <Separator />

        <CardContent className="py-12 flex flex-col items-center justify-center">
          {results.length === 0 ? (
            <p className="text-muted-foreground">
              No documents found. Try adjusting your filters.
            </p>
          ) : (
            /* If you later have results, map them here */
            <div>/* render list */</div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}