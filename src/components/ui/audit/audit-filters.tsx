"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type AuditFilterProps = {
    onFilter: (filteredData: any[]) => void; // Sends data to the parent to update the table
    onReset: () => void; // Tells the parent to reload original logs
};

export default function AuditFilter({ onFilter, onReset }: AuditFilterProps) {
    const testUserId = "0b0f8543-672e-4a5a-bb8d-99da74f94f90";

    // Internal state for the filter inputs
    const [filters, setFilters] = useState({
        userId: "all",
        action: "all",
        fromDate: "",
        toDate: ""
    });

    const handleFilterChange = (name: string, value: string) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleApplyFilters = async () => {
    try {
        const params = new URLSearchParams();
        
        if (filters.userId && filters.userId !== "all") params.append("userId", filters.userId);
        if (filters.action && filters.action !== "all") params.append("action", filters.action);
        
        // SEND RAW DATE ONLY (e.g., "2026-04-01")
        if (filters.fromDate) params.append("fromDate", filters.fromDate);
        if (filters.toDate) params.append("toDate", filters.toDate);

        const response = await fetch(`http://localhost:8081/admin/logs/filter?${params.toString()}`);
        const data = await response.json();
        onFilter(data);
    } catch (error) {
        console.error("Error filtering logs:", error);
    }
};
    

    const handleClear = () => {
        setFilters({
            userId: "all",
            action: "all",
            fromDate: "",
            toDate: ""
        });
        onReset(); // Trigger the parent to fetch all logs again
    };

    return (
        <Card className="shadow-sm border-muted">
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 font-bold text-sm">
                <Filter className="h-4 w-4 text-muted-foreground" />
                Audit Log Filters
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* User Filter */}
                    <div>
                        <label className="text-xs font-bold mb-1 block uppercase text-gray-500">User</label>
                        <Select 
                            value={filters.userId} 
                            onValueChange={(value) => handleFilterChange("userId", value)}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="All users" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All users</SelectItem>
                                <SelectItem value={testUserId}>Kamal Gunarathne (Me)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Action Filter */}
                    <div>
                        <label className="text-xs font-bold mb-1 block uppercase text-gray-500">Action</label>
                        <Select 
                            value={filters.action} 
                            onValueChange={(value) => handleFilterChange("action", value)}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="All actions" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All actions</SelectItem>
                                <SelectItem value="DOCUMENT_UPLOAD">Upload</SelectItem>
                                <SelectItem value="DOCUMENT_DELETED">Delete</SelectItem>
                                <SelectItem value="DOCUMENT_VIEWED">Viewed</SelectItem>
                                <SelectItem value="DOCUMENT_APPROVED">Approved</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date From */}
                    <div>
                        <label className="text-xs font-bold mb-1 block uppercase text-gray-500">Date From</label>
                        <Input 
                            type="date" 
                            className="h-9"
                            value={filters.fromDate}
                            onChange={(e) => handleFilterChange("fromDate", e.target.value)}
                        />
                    </div>

                    {/* Date To */}
                    <div>
                        <label className="text-xs font-bold mb-1 block uppercase text-gray-500">Date To</label>
                        <Input 
                            type="date" 
                            className="h-9"
                            value={filters.toDate}
                            onChange={(e) => handleFilterChange("toDate", e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex justify-start mt-6 gap-2 pt-4 border-t">
                    <Button 
                        onClick={handleApplyFilters}
                        className="bg-[#953002] text-white hover:bg-[#6B2100] h-9 px-6"
                    >
                        Apply Filters
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={handleClear}
                        className="bg-white text-[#242424] h-9 px-6 border-gray-300"
                    >
                        Reset
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}