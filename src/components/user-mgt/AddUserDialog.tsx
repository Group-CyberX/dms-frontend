"use client";
// React hooks for state and lifecycle
import { useEffect, useState, type FormEvent } from "react";
// UI components (dialog, inputs, buttons)
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUser, getRoles, type Role } from "@/lib/api-client";

type AddUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated?: () => Promise<void> | void;
};

export function AddUserDialog({
  open,
  onOpenChange,
  onUserCreated,
}: AddUserDialogProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
 // Roles fetched from backend
  const [roles, setRoles] = useState<Role[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
// Load roles when dialog opens
  useEffect(() => {
    if (!open) return;

    const loadRoles = async () => {
      try {
        const data = await getRoles();
        setRoles(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load roles";
        setError(message);
      }
    };

    loadRoles();
  }, [open]);
// Reset form fields
  const resetForm = () => {
    setUsername("");
    setEmail("");
    setRole("");
    setTemporaryPassword("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!username || !email || !role || !temporaryPassword) {
      setError("Please fill all fields");
      return;
    }

    setSubmitting(true);
    try {
      await createUser({
        username,
        email,
        password: temporaryPassword,
        role,
      });

      await onUserCreated?.();
      handleClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create user";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-[420px] rounded-[14px] border-0 bg-white p-0 shadow-[0_24px_60px_rgba(15,23,42,0.28)]"
        showCloseButton={false}
      >
        <div className="relative px-5 pb-4 pt-5 sm:px-6">
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close dialog"
          >
            <span className="text-lg leading-none">&times;</span>
          </button>

          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-[19px] font-semibold text-slate-900">
              Add New User
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Create a new user account
            </DialogDescription>
          </DialogHeader>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="username">
                Username
              </label>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter username"
                className="h-10 rounded-md border-slate-200 text-sm shadow-sm placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter email"
                className="h-10 rounded-md border-slate-200 text-sm shadow-sm placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="role">
                Role
              </label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger
                  id="role"
                  className="h-10 w-full rounded-md border-slate-200 text-sm shadow-sm"
                >
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((roleItem) => (
                    <SelectItem key={roleItem.roleId} value={roleItem.name}>
                      {roleItem.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="password">
                Temporary Password
              </label>
              <Input
                id="password"
                type="password"
                value={temporaryPassword}
                onChange={(event) => setTemporaryPassword(event.target.value)}
                placeholder="Enter password"
                className="h-10 rounded-md border-slate-200 text-sm shadow-sm placeholder:text-slate-400"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={submitting}
                className="h-10 rounded-md border-slate-200 px-4 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="h-10 rounded-md bg-[#953002] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#7f2600]"
              >
                {submitting ? "Creating..." : "Create User"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}