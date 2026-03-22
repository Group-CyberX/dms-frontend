import { create } from "zustand"

interface DocumentMetadata {
  metadataId: string
  key: string
  value: string
}

interface Document {
  documentId: string
  title: string
  metadata?: DocumentMetadata[]
}

interface SearchState {
  query: string
  results: Document[]
  setQuery: (query: string) => void
  setResults: (results: Document[]) => void
  clearResults: () => void
}

export const useSearchStore = create<SearchState>((set) => ({
  query: "",
  results: [],

  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
  clearResults: () => set({ results: [] }),
}))