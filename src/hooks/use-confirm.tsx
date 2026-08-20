"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ui/confirm-dialog";

/**
 * A confirmation the user has to answer before an action runs.
 *
 * window.confirm() returns a boolean straight away, which a React dialog cannot
 * do, so this returns a promise instead and the call site awaits it:
 *
 *   if (!(await confirm({ title: 'Delete this tag?', tone: 'destructive' }))) return;
 *
 * One dialog instance lives in the provider, so no screen has to hold its own
 * open/target state just to ask a question.
 */

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [busy, setBusy] = useState(false);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((next) => {
    setOptions(next);
    setBusy(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (answer: boolean) => {
    resolver.current?.(answer);
    resolver.current = null;
    setOptions(null);
    setBusy(false);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        options={options}
        busy={busy}
        onCancel={() => settle(false)}
        onConfirm={() => settle(true)}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used inside <ConfirmProvider>");
  }
  return ctx;
}
