import {Card, CardContent} from "@/components/ui/card";
import { ShieldCheck }  from "lucide-react";

export default function AuditRetention() {
    return (
        <div className="flex items-start gap-5 padding-4">
            <ShieldCheck className="h-6 w-6 text-green-500" />
            <div>
                <h3 className="text-lg font-semibold mb-1">Audit log Retention</h3>
                <p className="text-sm text-muted-foreground">
                    Logs are retained for 7 years in compliance with requirements, automated backups are performed daily with immutable storage.
                </p>
            </div>
        </div>
    );
}
