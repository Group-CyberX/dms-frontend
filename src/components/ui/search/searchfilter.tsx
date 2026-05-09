"use client"

import * as React from "react"
import { Filter, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchWithAuth } from "@/lib/api-client"

export interface SearchFiltersRef {
  getFilters: () => AdvancedSearchFilters;
}

export interface AdvancedSearchFilters {
  query: string;
  documentType: string;
  status: string;
  owner: string;
  signatureStatus: string;
  dateRange: string;
  tags: string;
}

function toOptionLabel(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>
    const candidates = [
      item.name,
      item.label,
      item.value,
      item.tagName,
      item.tag_name,
    ]

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        return candidate.trim()
      }
    }
  }

  return null
}

function normalizeOptions(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return []
  }

  const labels = values
    .map((entry) => toOptionLabel(entry))
    .filter((entry): entry is string => Boolean(entry))

  return Array.from(new Set(labels))
}

function toOptionValue(label: string): string {
  return label.toLowerCase().replace(/\s+/g, "-")
}

// Helper component for uniform filter inputs
function FilterField({ 
  label, 
  placeholder, 
  options = [],
  value,
  onChange
}: { 
  label: string
  placeholder: string
  options?: string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-600">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 w-full bg-white border-slate-200 focus:ring-[#953002]/20">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={toOptionValue(opt)}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// Named export with useImperativeHandle
export const SearchFilters = React.forwardRef<SearchFiltersRef, {
  onSearch?: (filters: AdvancedSearchFilters) => void
}>(({ onSearch }, ref) => {
  const [query, setQuery] = React.useState("")
  const [documentType, setDocumentType] = React.useState("")
  const [status, setStatus] = React.useState("")
  const [owner, setOwner] = React.useState("")
  const [signatureStatus, setSignatureStatus] = React.useState("")
  const [dateRange, setDateRange] = React.useState("")
  const [tags, setTags] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  
  // Dropdown options states
  const [documentTypes, setDocumentTypes] = React.useState<string[]>(["Invoice", "Contract", "Report", "Memo"])
  const [statuses, setStatuses] = React.useState<string[]>(["Approved", "Pending", "Rejected", "Draft"])
  const [owners, setOwners] = React.useState<string[]>(["Me", "Team", "Organization"])
  const [signatureStatuses, setSignatureStatuses] = React.useState<string[]>(["Signed", "Unsigned", "Pending Signature"])
  const [dateRanges, setDateRanges] = React.useState<string[]>(["Last 7 Days", "Last 30 Days", "This Year"])
  const [tagOptions, setTagOptions] = React.useState<string[]>(["Finance", "Legal", "HR", "Operations"])
  
  // Load dropdown options on mount
  React.useEffect(() => {
    const loadDropdownOptions = async () => {
      try {
        // Fetch filter options from backend
        const optionsResponse = await fetchWithAuth('http://localhost:8081/api/search/options', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (optionsResponse.ok) {
          const optionsData = await optionsResponse.json()
          const nextDocumentTypes = normalizeOptions(optionsData.documentTypes)
          const nextStatuses = normalizeOptions(optionsData.statuses)
          const nextOwners = normalizeOptions(optionsData.owners)
          const nextSignatureStatuses = normalizeOptions(optionsData.signatureStatuses)
          const nextDateRanges = normalizeOptions(optionsData.dateRanges)

          if (nextDocumentTypes.length > 0) setDocumentTypes(nextDocumentTypes)
          if (nextStatuses.length > 0) setStatuses(nextStatuses)
          if (nextOwners.length > 0) setOwners(nextOwners)
          if (nextSignatureStatuses.length > 0) setSignatureStatuses(nextSignatureStatuses)
          if (nextDateRanges.length > 0) setDateRanges(nextDateRanges)
        }
        
        // Fetch tags from backend
        const tagsResponse = await fetchWithAuth('http://localhost:8081/api/tags', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json()
          const nextTags = normalizeOptions(tagsData)
          if (nextTags.length > 0) {
            setTagOptions(nextTags)
          }
        }
      } catch (error) {
        console.warn("Failed to load dropdown options from backend, using defaults", error)
        // Keep defaults if backend fails
      }
    }
    
    loadDropdownOptions()
  }, [])

  React.useImperativeHandle(ref, () => ({
    getFilters: () => ({
      query,
      documentType,
      status,
      owner,
      signatureStatus,
      dateRange,
      tags
    })
  }))

  const handleSearch = async () => {
    if (!query.trim()) {
      alert("Please enter a search query")
      return
    }

    setIsLoading(true)
    try {
      const filters: AdvancedSearchFilters = {
        query,
        documentType: documentType || "",
        status: status || "",
        owner: owner || "",
        signatureStatus: signatureStatus || "",
        dateRange: dateRange || "",
        tags: tags || ""
      }

      if (onSearch) {
        onSearch(filters)
      }
    } catch (error) {
      console.error("Search error:", error)
      alert("Failed to perform search")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setQuery("")
    setDocumentType("")
    setStatus("")
    setOwner("")
    setSignatureStatus("")
    setDateRange("")
    setTags("")
  }

  return (
    <Card className="w-full shadow-sm border border-slate-200">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-medium text-slate-700">
          <Filter className="h-5 w-5" />
          Search Filters
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Search Query Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-600">
            Search Query
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Enter keywords, document content, or metadata..." 
              className="pl-10 h-10 bg-white"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FilterField 
            label="Document Type" 
            placeholder="All types" 
            options={documentTypes}
            value={documentType}
            onChange={setDocumentType}
          />
          <FilterField 
            label="Status" 
            placeholder="All statuses" 
            options={statuses}
            value={status}
            onChange={setStatus}
          />
          <FilterField 
            label="Date Range" 
            placeholder="Any time" 
            options={dateRanges}
            value={dateRange}
            onChange={setDateRange}
          />
          <FilterField 
            label="Tags" 
            placeholder="Select tags" 
            options={tagOptions}
            value={tags}
            onChange={setTags}
          />
          <FilterField 
            label="Owner" 
            placeholder="Any owner" 
            options={owners}
            value={owner}
            onChange={setOwner}
          />
          <FilterField 
            label="Signature Status" 
            placeholder="Any" 
            options={signatureStatuses}
            value={signatureStatus}
            onChange={setSignatureStatus}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button 
            onClick={handleSearch}
            disabled={isLoading}
            className="bg-[#953002] hover:bg-[#7a2702] text-white h-10 px-6 gap-2 transition-colors disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            {isLoading ? "Searching..." : "Search"}
          </Button>
          
          <Button 
            onClick={handleClear}
            variant="outline" 
            className="h-10 px-4 text-slate-700 border-slate-200 bg-white hover:bg-slate-50"
          >
            Clear Filters
          </Button>
          
          <Button 
            variant="outline" 
            className="h-10 px-4 text-slate-700 border-slate-200 bg-white hover:bg-slate-50"
          >
            Save Search
          </Button>
        </div>
      </CardContent>
    </Card>
  )
})