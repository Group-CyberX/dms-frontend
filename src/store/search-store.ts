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
  page: number
  totalPages: number
  totalElements: number
  filters: SearchFilters
  setQuery: (query: string) => void
  setResults: (results: Document[]) => void
  setPagination: (page: number, totalPages: number, totalElements: number) => void
  setPage: (page: number) => void
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
  page: 0,
  totalPages: 1,
  totalElements: 0,
  filters: defaultFilters,

  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
  setPagination: (page, totalPages, totalElements) => set({ page, totalPages, totalElements }),
  setPage: (page) => set({ page }),
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      page: 0 // Reset to first page when filters change
    })),
  clearFilters: () => set({ filters: defaultFilters, results: [], page: 0, totalPages: 1, totalElements: 0 }),
  clearResults: () => set({ results: [], page: 0, totalPages: 1, totalElements: 0 }),
}))