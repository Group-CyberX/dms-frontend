import {Card, CardContent} from "@/components/ui/card";

export default function AuditRetention(){
    return (
        <Card>
            <CardContent className="p-6">
                <h3 className="text-lg font-semibold">
                    Audit log Retention
                </h3>
                <p className="text-sm text-muted-foreground">
                    Logs are retained for 7 years in compliance with requirements,automated backups are performed daily with immutable storage.
                </p>
            </CardContent>
        </Card>
    )
}