import { create } from "zustand"

export interface Document {
  documentId: string
  title: string
  createdAt?: string
  owner?: string
  status?: string
  description?: string
  tags?: string[]
  metadata?: Record<string, string>
}

interface SearchFilters {
  query: string
  documentType: string
  status: string
  owner: string
  tags: string
  signatureStatus: string
  dateRange: string // "all", "lastWeek", "lastMonth", "lastQuarter", "lastYear"
}

interface SearchState {
  query: string
  results: Document[]
  filters: SearchFilters
  setQuery: (query: string) => void
  setResults: (results: Document[]) => void
  setFilters: (filters: Partial<SearchFilters>) => void
  clearFilters: () => void
  clearResults: () => void
}

const defaultFilters: SearchFilters = {
  query: "",
  documentType: "",
  status: "",
  owner: "",
  tags: "",
  signatureStatus: "",
  dateRange: "all",
}

export const useSearchStore = create<SearchState>((set) => ({
  query: "",
  results: [],
  filters: defaultFilters,

  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),
  clearFilters: () => set({ filters: defaultFilters, results: [] }),
  clearResults: () => set({ results: [] }),
}))