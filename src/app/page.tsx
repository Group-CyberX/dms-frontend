"use client"

import * as React from "react"
import { Search } from "lucide-react"

// Import your provided UI components
import { Card, CardContent } from "@/components/ui/card"

// Import SearchFilters component from the specified location
import { SearchFilters } from "@/components/ui/search/searchfilter"

export default function AdvancedSearch() {
  return (
<<<<<<< HEAD
    <div className="w-full max-w-6xl mx-auto space-y-8 p-6 bg-transparent">
      
      {/* 1. Page Title & Description Section */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-[#953002]">Advanced Search</h1>
        <p className="text-slate-500 text-sm">
          Search documents using advanced filters and criteria
        </p>
      </div>

      {/* 2. Search Filters Component */}
      {/* This component (imported from components/ui/search/searchfilter) 
          contains the primary "Search Query" text box as shown in the screenshot. 
      */}
      <SearchFilters />

      {/* 3. Search Results Section */}
      <div className="space-y-4">
        {/* Results Header */}
        <div className="flex items-center justify-between border-b pb-4 border-slate-200">
          <h2 className="text-lg font-semibold text-slate-700">Search Results</h2>
          <span className="text-sm font-medium text-slate-500">0 documents found</span>
=======
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            hello CyberX! Good morning!
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Looking for a starting point or more instructions? Head over to{" "}
            <a
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Templates
            </a>{" "}
            or the{" "}
            <a
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Learning
            </a>{" "}
            center.
          </p>
>>>>>>> 98eb94af91edba9e9159d01c3a19d3bf02d60ace
        </div>

        {/* Empty State Result Area
            Matches the request to exclude data while maintaining the results container.
        */}
        <Card className="border-dashed border-2 bg-slate-50/50 py-16 flex flex-col items-center justify-center">
          <CardContent className="flex flex-col items-center justify-center text-center">
            {/* Magnifying glass icon for the search placeholder */}
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
              <Search size={24} />
            </div>
            <p className="text-slate-600 font-medium text-lg">No results to display</p>
            <p className="text-sm text-slate-400 mt-1 max-w-xs">
              Enter keywords in the search query above or adjust your filters to find documents.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}