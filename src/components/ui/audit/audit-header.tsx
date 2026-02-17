import { Button } from "@/components/ui/button"
import { Download, FileText } from "lucide-react"

export default function AuditHeader(){
    return (
        <div className="flex items-center justify-between">
            {/*left side*/}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#953002]">Audit Logs</h1>
                <p className="text-sm text-[#242424] mt-1">
                    Track all system activities for compliance and security
                </p>
            </div>

            {/*right side*/}
            <div className="flex items-center gap-2">
                <Button variant="outline" className="gap-2 bg-[#953002] text-white">
                    <FileText className="h-4 w-4"/>
                    Export CSV
                </Button>
                <Button className="gap-2 bg-[#FFFFFF] text-[#242424] border-1">
                    <Download className="h-4 w-4"/>
                    Export PDF
                </Button>
            </div>
        </div>
    )
}