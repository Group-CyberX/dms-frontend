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

export default function AuditTable(){
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

    return(
        <div className="rounded-md border">
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
                            <Badge variant={log.status==="Success"?"default":"destructive"}>
                                {log.status}
                            </Badge>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
        
        </div>
    )
}