import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table";
  
  import {Badge} from "@/components/ui/badge";

import { forwardRef, useImperativeHandle } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { UUID } from "crypto";

type AuditLog={
    log_id: UUID;
    user_id: UUID;
    action: string;
    entity_id: UUID;
    timestamp: string;
    ip: string;
    status: string;
    };

type Props = {
    logs:AuditLog[];
};
const AuditTable = forwardRef<any, Props>(function AuditTable({logs=[]}, ref) {
    
    const exportToCSV = () => {
        if (!logs || logs.length === 0) return;

        const headers = ["User", "Action", "Entity", "Timestamp", "Status"];

        const rows = logs.map(log => [
            log.user_id,
            log.action,
            log.entity_id,
            formatAuditDate(log.timestamp),
            log.ip=== "0:0:0:0:0:0:0:1" ? "127.0.0.1 (Local)" : log.ip,
            log.status
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "audit_logs.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    useImperativeHandle(ref, () => ({
        exportToCSV,
        exportToPDF
    }));

    const exportToPDF = () => {
  const doc = new jsPDF();

  // Title
  doc.text("Audit Logs Report", 14, 15);

  // Table columns
  const tableColumn = ["User", "Action", "Entity", "Timestamp", "IP Address", "Status"];

  // Table rows
  const tableRows = logs.map(log => [
    log.user_id,
    log.action,
    log.entity_id,
    formatAuditDate(log.timestamp),
    log.ip=== "0:0:0:0:0:0:0:1" ? "127.0.0.1 (Local)" : log.ip,
    log.status
  ]);

  // Generate table
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 20,
  });

  // Save file
  doc.save("audit_logs.pdf");
};
// Helper function to format date
const formatAuditDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).format(date);
};

    return(
        <div className="rounded-md border bg-card">
            <h6 className="text-lg font-semibold p-4 pb-0">Activity log - {logs.length} entries</h6>
            
            <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Time Stamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>

            <TableBody>
                {logs.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">
                            No logs available.
                        </TableCell>
                    </TableRow>
                ) : (
                logs.map((log)=>(
                    <TableRow key={log.log_id}>
                        <TableCell className="whitespace-nowrap">
                           {formatAuditDate(log.timestamp)}
                        </TableCell>
                        <TableCell>{log.user_id}</TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell>{log.entity_id}</TableCell>
                        <TableCell>
                              {log.ip === "0:0:0:0:0:0:0:1" ? "127.0.0.1 (Local)" : log.ip}
                        </TableCell>
                        <TableCell>
                            <Badge 
                            className={`px-4 py-2 rounded ${
                                log.status === "Success"
                                ? "bg-[#953002] hover:bg-[#7a2601] text-white"
                                : log.status === "Failed"
                                ? "bg-[#D4183D] hover:bg-[#b01333] text-white"
                                : ""
          }`}>
                            {log.status}
                            </Badge>
                        </TableCell>
                    </TableRow>
                ))
)}
            </TableBody>
        </Table>
    
        
        </div>
    )
});

export default AuditTable;

