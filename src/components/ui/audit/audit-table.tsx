import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table";
  
  import {Badge} from "@/components/ui/badge";
import { timeStamp } from "console";
import ExportButtons from "@/components/ui/audit/exportButton";

import { forwardRef, useImperativeHandle } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const AuditTable = forwardRef(function AuditTable(props, ref) {
    const logs=[
        {
            id:1,
            timeStamp:"2024-06-01 10:00:00",
            user:"John Doe",
            action:"Login",
            entity:"System",
            ip:"192.168.1.1",
            status:"Success"
        },
        {
            id:2,
            timeStamp:"2024-06-01 10:05:00",
            user:"Jane Smith",
            action:"Logout",
            entity:"System",
            ip:"192.168.1.2",
            status:"Success"
        },
        {
            id:3,
            timeStamp:"2024-06-01 10:10:00",
            user:"kiore Doe",
            action:"Data Change",
            entity:"Customer Record",
            ip:"192.168.1.3",
            status:"Failed"
        }
    ]


    const exportToCSV = () => {
        if (!logs || logs.length === 0) return;

        const headers = ["User", "Action", "Entity", "Timestamp", "Status"];

        const rows = logs.map(log => [
            log.user,
            log.action,
            log.entity,
            log.timeStamp,
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
  const tableColumn = ["User", "Action", "Entity", "Timestamp", "Status"];

  // Table rows
  const tableRows = logs.map(log => [
    log.user,
    log.action,
    log.entity,
    log.timeStamp,
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


    return(
        <div className="rounded-md border bg-card">
            <h6 className="text-lg font-semibold p-4 pb-0">Activity log - 3 entries</h6>
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
                {logs.map((log)=>(
                    <TableRow key={log.id}>
                        <TableCell>{log.timeStamp}</TableCell>
                        <TableCell>{log.user}</TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell>{log.entity}</TableCell>
                        <TableCell>{log.ip}</TableCell>
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
                ))}
            </TableBody>
        </Table>
    
        
        </div>
    )
});

export default AuditTable;

