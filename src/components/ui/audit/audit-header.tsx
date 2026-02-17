import { Button } from "@/components/ui/button"


export default function AuditHeader(){
    return (
        <div className="flex items-center justify-between">
            {/*left side*/}
            <div>
                <h1 className="text-2xl font-semibold">Audit Logs</h1>
                <p className="text-sm text-muted-foreground">
                    Track all system activities for compliance and security
                </p>
            </div>

            {/*right side*/}
            <div className="flex items-center gap-2">
                <Button variant="outline">
                    Export CSV
                </Button>
                <Button variant="outline">
                    Export PDF
                </Button>
            </div>
        </div>
    )
}