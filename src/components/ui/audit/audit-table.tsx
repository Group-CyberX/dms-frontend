"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { forwardRef, useImperativeHandle } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { UUID } from "crypto";

type AuditLog = {
    log_id: UUID;
    user_id: UUID;
    /** Display name of the actor, resolved by the server from user_id. */
    user_name?: string | null;
    action: string;
    entity_id: UUID;
    timestamp: string;
    ip: string;
    status: string;
    /** What was attempted, in words - set for downloads, denials, exports. */
    details?: string | null;
};

/**
 * What to show in the User Name column.
 *
 * A missing name means one of two different things, and an auditor needs to
 * tell them apart: an event with no actor at all - a refused request, a failed
 * login - or an actor whose account has since been deleted. The id is kept in
 * either case, so the row can still be traced.
 */
const userLabel = (log: AuditLog) => {
    if (log.user_name) return log.user_name;
    return log.user_id ? "Deleted user" : "System";
};

type Props = {
    logs: AuditLog[];
};

export interface AuditTableRef {
    // The rows to export are passed in: the table shows one page, but an export
    // should cover every row matching the current filters.
    exportToCSV: (rows?: AuditLog[]) => void;
    exportToPDF: (rows?: AuditLog[]) => void;
}

const AuditTable = forwardRef<AuditTableRef, Props>(function AuditTable({ logs = [] }, ref) {

    // Sort logs so that the most recent entries are at the top
    const sortedLogs = [...logs].sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // ---- Export -------------------------------------------------------
    //
    // Both exports are built from one column list and one row builder, so a
    // CSV and a PDF taken from the same screen always describe the same thing.
    // They used to be written out twice, in a different column order from each
    // other and from the table.

    const exportRowsOrVisible = (rows?: AuditLog[]) =>
        rows && rows.length > 0 ? rows : sortedLogs;

    /**
     * A timestamp that survives a spreadsheet.
     *
     * The on-screen format ("August 17, 2026 at 05:07 PM") contains a comma,
     * and it was being written into the CSV unquoted - so every column after
     * it shifted one place right, putting the IP under Timestamp and the
     * status under IP. Sorted date-first order also sorts correctly as text,
     * which the long-form month name does not.
     */
    const formatExportDate = (value: string | Date) => {
        const date = value instanceof Date ? value : new Date(value);
        if (!value || Number.isNaN(date.getTime())) return "N/A";
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
             + ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

    const formatIp = (ip: string) =>
        ip === "0:0:0:0:0:0:0:1" ? "127.0.0.1 (local)" : (ip || "-");

    // Same order as the table on screen, so the file reads the way the page did.
    const EXPORT_COLUMNS = [
        "Timestamp", "User ID", "User Name", "Action",
        "Details", "Entity ID", "IP Address", "Status",
    ];

    const toExportRow = (log: AuditLog): string[] => [
        formatExportDate(log.timestamp),
        log.user_id ? String(log.user_id) : "-",
        userLabel(log),
        log.action || "-",
        log.details || "-",
        log.entity_id ? String(log.entity_id) : "-",
        formatIp(log.ip),
        log.status || "-",
    ];

    /** Timestamped, so exporting twice does not give you "audit_logs (1)". */
    const exportFileName = (extension: string) => {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        return `audit-log-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
             + `-${pad(now.getHours())}${pad(now.getMinutes())}.${extension}`;
    };

    const saveBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    /**
     * Every field quoted, not just the ones that looked risky.
     *
     * Picking which columns to quote is what broke the file: the timestamp was
     * left bare and it contains a comma. Quoting everything costs nothing and
     * cannot be got wrong as new columns are added.
     */
    const csvCell = (value: string) => {
        // Newlines inside a quoted field are legal, but several spreadsheet
        // importers still break the row on them, so they are flattened.
        const flat = String(value ?? "").replace(/\r?\n/g, " ").trim();
        return `"${flat.replace(/"/g, '""')}"`;
    };

    const exportToCSV = (rows?: AuditLog[]) => {
        const exportRows = exportRowsOrVisible(rows);
        if (exportRows.length === 0) return;

        const lines = [
            EXPORT_COLUMNS.map(csvCell).join(","),
            ...exportRows.map((log) => toExportRow(log).map(csvCell).join(",")),
        ];

        // CRLF and a leading BOM: without the BOM, Excel on Windows reads the
        // file as ANSI and any non-ASCII name arrives mangled.
        const blob = new Blob(["﻿" + lines.join("\r\n")], {
            type: "text/csv;charset=utf-8;",
        });
        saveBlob(blob, exportFileName("csv"));
    };

    const exportToPDF = (rows?: AuditLog[]) => {
        const exportRows = exportRowsOrVisible(rows);
        if (exportRows.length === 0) return;

        // Landscape. Eight columns, two of them full 36-character UUIDs, do not
        // fit across a portrait page - the ids wrapped over several lines and
        // squeezed every other column into an unreadable sliver.
        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        doc.setFontSize(14);
        doc.setTextColor(35);
        doc.text("Audit Log Report", 10, 13);

        // When it was taken and how much it covers. An audit export without
        // that on the page is weak evidence - there is no way to tell later
        // which period it describes or whether it was the whole trail.
        doc.setFontSize(8.5);
        doc.setTextColor(115);
        doc.text(
            `Generated ${formatExportDate(new Date())}   ·   `
            + `${exportRows.length} ${exportRows.length === 1 ? "entry" : "entries"}`,
            10, 18.5
        );

        autoTable(doc, {
            head: [EXPORT_COLUMNS],
            body: exportRows.map(toExportRow),
            startY: 23,
            theme: "grid",
            styles: {
                fontSize: 7,
                cellPadding: 1.6,
                overflow: "linebreak",
                valign: "top",
                lineColor: [224, 224, 224],
                lineWidth: 0.1,
            },
            headStyles: {
                fillColor: [149, 48, 2],   // the app's brand brown
                textColor: 255,
                fontStyle: "bold",
                fontSize: 7.5,
            },
            // Striping matters more here than on screen: the rows are wide, and
            // it is what keeps your eye on one record across the full width.
            alternateRowStyles: { fillColor: [250, 247, 246] },
            // These total exactly 277mm - the landscape page less its margins.
            // They have to add up to the full width: given explicit widths that
            // fall short, autoTable leaves the remainder unused and logs that
            // it "could not fit page". The two text columns carry the slack,
            // because they are the ones whose content actually wraps.
            columnStyles: {
                0: { cellWidth: 30 },                 // Timestamp
                1: { cellWidth: 32, fontSize: 6 },    // User ID   - wraps at the hyphens
                2: { cellWidth: 30 },                 // User Name
                3: { cellWidth: 45 },                 // Action
                4: { cellWidth: 63 },                 // Details
                5: { cellWidth: 32, fontSize: 6 },    // Entity ID - wraps at the hyphens
                6: { cellWidth: 25 },                 // IP Address
                7: { cellWidth: 20 },                 // Status
            },
            margin: { top: 23, left: 10, right: 10, bottom: 14 },
            // A failure is the row an auditor is looking for, so it is marked
            // rather than left to read the same as every success.
            didParseCell: (data) => {
                if (data.section !== "body" || data.column.index !== 7) return;
                const value = String(data.cell.raw ?? "").toUpperCase();
                if (value.includes("FAIL") || value.includes("DENIED")) {
                    data.cell.styles.textColor = [180, 25, 55];
                    data.cell.styles.fontStyle = "bold";
                }
            },
        });

        // Page numbers are stamped after the table, because the total is only
        // known once every row has been laid out.
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(7.5);
            doc.setTextColor(135);
            doc.text("Universal DMS · audit trail", 10, pageHeight - 6);
            doc.text(`Page ${i} of ${pageCount}`, pageWidth - 10, pageHeight - 6, { align: "right" });
        }

        doc.save(exportFileName("pdf"));
    };

    // Expose the export functions to the parent component
    useImperativeHandle(ref, () => ({ exportToCSV, exportToPDF }));

    const formatAuditDate = (dateString: string) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        }).format(date);
    };

    return (
        <div className="rounded-md border bg-card">
            <h6 className="text-lg font-semibold p-4 pb-0">Activity log - {sortedLogs.length} entries</h6>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Time Stamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>User Name</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {!Array.isArray(sortedLogs) || sortedLogs.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="text-center py-4">No logs available.</TableCell>
                        </TableRow>
                    ) : (
                        sortedLogs.map((log) => (
                            <TableRow key={log.log_id}>
                                <TableCell className="whitespace-nowrap">{formatAuditDate(log.timestamp)}</TableCell>
                                <TableCell className="text-xs">{log.user_id || "-"}</TableCell>
                                <TableCell className={`whitespace-nowrap ${log.user_name ? "font-medium" : "text-muted-foreground italic"}`}>
                                    {userLabel(log)}
                                </TableCell>
                                <TableCell className="whitespace-nowrap font-medium">{log.action}</TableCell>
                                <TableCell className="text-xs text-muted-foreground max-w-xs">
                                    {log.details || "-"}
                                </TableCell>
                                <TableCell className="text-xs">{log.entity_id}</TableCell>
                                <TableCell>{log.ip === "0:0:0:0:0:0:0:1" ? "127.0.0.1" : log.ip}</TableCell>
                                <TableCell>
                                    <Badge className={`px-4 py-2 rounded ${log.status === "SUCCESS" || log.status === "Success" ? "bg-[#953002] text-white" : "bg-[#D4183D] text-white"}`}>
                                        {log.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
});

export default AuditTable;