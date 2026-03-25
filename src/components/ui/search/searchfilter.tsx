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

// Helper component for uniform filter inputs
function FilterField({ 
  label, 
  placeholder, 
  options = [] 
}: { 
  label: string
  placeholder: string
  options?: string[] 
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-600">
        {label}
      </label>
      <Select>
        <SelectTrigger className="h-10 w-full bg-white border-slate-200 focus:ring-[#953002]/20">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt.toLowerCase().replace(/\s+/g, "-")}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// Named export
export function SearchFilters() {
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
            />
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FilterField 
            label="Document Type" 
            placeholder="All types" 
            options={["Invoice", "Contract", "Report", "Memo"]}
          />
          <FilterField 
            label="Status" 
            placeholder="All statuses" 
            options={["Approved", "Pending", "Rejected", "Draft"]}
          />
          <FilterField 
            label="Date Range" 
            placeholder="Any time" 
            options={["Last 7 Days", "Last 30 Days", "This Year", "Custom Range"]}
          />
          <FilterField 
            label="Tags" 
            placeholder="Select tags" 
            options={["Finance", "Legal", "HR", "Operations"]}
          />
          <FilterField 
            label="Owner" 
            placeholder="Any owner" 
            options={["Me", "Team", "Organization"]}
          />
          <FilterField 
            label="Signature Status" 
            placeholder="Any" 
            options={["Signed", "Unsigned", "Pending Signature"]}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button className="bg-[#953002] hover:bg-[#7a2702] text-white h-10 px-6 gap-2 transition-colors">
            <Search className="h-4 w-4" />
            Search
          </Button>
          
          <Button variant="outline" className="h-10 px-4 text-slate-700 border-slate-200 bg-white hover:bg-slate-50">
            Clear Filters
          </Button>
          
          <Button variant="outline" className="h-10 px-4 text-slate-700 border-slate-200 bg-white hover:bg-slate-50">
            Save Search
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}