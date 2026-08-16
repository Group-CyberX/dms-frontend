import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Key } from "lucide-react";

/**
 * API key management.
 *
 * The DMS authenticates callers with JWTs issued at sign-in; there is no
 * separate machine credential to show here yet. This card used to display a
 * key built from Math.random() and a Regenerate button that only replaced that
 * random string in component state - nothing was ever issued, stored or
 * accepted by the API, so any key copied from here would simply have failed.
 * It reports the real position instead, and ERP connections continue to hold
 * their own credentials against the connection record.
 */
export default function ApiKeysCard() {
  return (
    <Card className="bg-white">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Key className="text-[#953002]" size={24} />
          <div>
            <CardTitle>API Key Management</CardTitle>
            <CardDescription>Credentials for external integrations</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            Machine API keys are not issued yet
          </p>
          <p className="mt-1 text-sm text-amber-800">
            External callers authenticate with a bearer token from{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">/auth/login</code>. ERP
            integrations keep their own credentials on each connection, set under ERP Integration.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
