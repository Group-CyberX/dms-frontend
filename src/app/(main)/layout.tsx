"use client";

import { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import NavigationSideBar from "@/components/NavigationItem/NavigationSideBar";
import { formatRoleLabel, canAccessPath } from "@/lib/access-control";
import { useAuthStore } from "@/store/auth-store";
import { Bell, Check, FileText, Search, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type NotificationItem = {
  notificationId: string;
  message: string;
  createdAt?: string;
  isRead?: boolean;
  read?: boolean;
};

function TimeAgo({ date }: { date: string }) {
  const [time, setTime] = useState(
    formatDistanceToNow(new Date(date), { addSuffix: true })
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(formatDistanceToNow(new Date(date), { addSuffix: true }));
    }, 60000);

    return () => clearInterval(interval);
  }, [date]);

  return <span>{time}</span>;
}

function getNotificationTitle(message: string) {
  const msg = message.toLowerCase();

  if (msg.includes("approved")) return "Document Approved";
  if (msg.includes("rejected")) return "Document Rejected";
  if (msg.includes("uploaded")) return "New Upload";
  if (msg.includes("workflow")) return "Workflow Update";
  if (msg.includes("commented")) return "New Comment";
  if (msg.includes("assigned")) return "Task Assigned";
  if (msg.includes("deadline")) return "Deadline Reminder";
  if (msg.includes("deleted")) return "Document Deleted";
  if (msg.includes("shared")) return "Document Shared";
  if (msg.includes("version")) return "Version Update";
  if (msg.includes("error") || msg.includes("failed")) return "Action Failed";
  if (msg.includes("requires your approval")) return "Action Required";
  if (msg.includes("new login") || msg.includes("logged in")) return "New Login Detected";
  if (msg.includes("password") && msg.includes("changed")) return "Password Changed";

  return "System Alert";
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const token = useAuthStore((state) => state.accessToken);
  const email = useAuthStore((state) => state.email);
  const role = useAuthStore((state) => state.role);
  const permissions = useAuthStore((state) => state.permissions);

  const [hydrated, setHydrated] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);

  useLayoutEffect(() => {
    hydratedRef.current = true;
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;

    if (!token) {
      router.replace("/login");
      return;
    }

    if (!canAccessPath(pathname, role, permissions)) {
      router.replace("/unauthorized");
    }
  }, [token, pathname, role, permissions, router]);

  const displayName = useMemo(() => {
    if (!email) return "User";
    const [left] = email.split("@");
    return left
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }, [email]);

  const initials = useMemo(() => {
    return displayName
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [displayName]);

  const roleLabel = useMemo(() => formatRoleLabel(role), [role]);

  useEffect(() => {
    if (!hydrated || !token) return;

    const fetchNotifications = async () => {
      try {
        const response = await fetch("http://localhost:8081/api/notifications?userId=0b0f8543-672e-4a5a-bb8d-99da74f94f90", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        setNotifications(Array.isArray(data) ? data : []);
      } catch {
        setNotifications([]);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [hydrated, token]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isNotificationOpen && notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isNotificationOpen]);

  const unreadCount = notifications.filter((notification) => !(notification.isRead ?? notification.read)).length;

  const handleNotificationClick = async (notification: NotificationItem) => {
    setSelectedNotification(notification);

    if (!(notification.isRead ?? notification.read)) {
      try {
        const response = await fetch(
          `http://localhost:8081/api/notifications/${notification.notificationId}/read`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          setNotifications((previous) =>
            previous.map((item) =>
              item.notificationId === notification.notificationId
                ? { ...item, isRead: true, read: true }
                : item
            )
          );
        }
      } catch {
        // Keep the existing UI responsive even if the mark-read call fails.
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const response = await fetch(
        "http://localhost:8081/api/notifications/mark-all-read?userId=0b0f8543-672e-4a5a-bb8d-99da74f94f90",
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setNotifications((previous) => previous.map((item) => ({ ...item, isRead: true, read: true })));
      }
    } catch {
      // No-op: keep the dropdown usable.
    }
  };

  if (!hydrated) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-[#ececec]">
        <NavigationSideBar />
        
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="grid h-16 grid-cols-[1fr_auto_1fr] items-center border-b border-slate-200 bg-white px-4 lg:px-8">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-slate-700 hover:bg-slate-100" />
            </div>

            <div className="relative hidden w-[min(560px,calc(100vw-420px))] md:block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search documents, tasks, workflows..."
                className="h-10 w-full rounded-md border-0 bg-slate-100 pl-11 pr-4 text-sm text-slate-700 shadow-sm outline-none placeholder:text-slate-400 focus:ring-1 focus:ring-[#953002]"
              />
            </div>

            <div className="flex items-center justify-end gap-4">
              <div className="relative" ref={notificationRef}>
                <button
                  type="button"
                  onClick={() => setIsNotificationOpen((previous) => !previous)}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#d62440] px-1 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {isNotificationOpen && (
                  <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-lg border bg-white shadow-xl z-50">
                    <div className="flex items-center justify-between border-b p-4">
                      <div>
                        <h3 className="text-sm font-bold text-gray-800">Notifications</h3>
                        <p className="text-sm text-gray-600">
                          You have {unreadCount} unread notifications
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-black"
                      >
                        <Check className="h-3 w-3" /> Mark all read
                      </button>
                    </div>

                    <div className="max-h-[350px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="p-10 text-center text-xs text-gray-400">No new notifications</p>
                      ) : (
                        notifications.map((notification) => {
                          const isRead = notification.isRead ?? notification.read;

                          return (
                            <div
                              key={notification.notificationId}
                              onClick={() => handleNotificationClick(notification)}
                              className={`relative flex gap-3 border-b p-4 transition-colors hover:bg-slate-100 ${
                                !isRead ? "bg-[#953002]/5" : "bg-white"
                              }`}
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100">
                                <FileText className="h-4 w-4 text-orange-700" />
                              </div>

                              <div className="flex-1">
                                <p className="text-xs font-bold leading-none text-gray-800">
                                  {getNotificationTitle(notification.message)}
                                </p>
                                <p className="mt-1 text-[11px] leading-tight text-gray-500">
                                  {notification.message}
                                </p>
                                <p className="mt-2 text-[10px] text-gray-400">
                                  {notification.createdAt ? (
                                    <TimeAgo date={notification.createdAt} />
                                  ) : (
                                    "Just now"
                                  )}
                                </p>
                              </div>

                              {!isRead && (
                                <div className="absolute right-4 top-4 h-2 w-2 rounded-full bg-[#953002]" />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    <button
                      type="button"
                      className="w-full border-t p-3 text-center text-xs font-medium text-gray-500 hover:bg-slate-50"
                    >
                      View all notifications
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
                <div className="hidden text-right leading-tight sm:block">
                  <p className="text-sm font-semibold text-slate-800">{displayName}</p>
                  <p className="text-[11px] uppercase tracking-tight text-slate-500">
                    {roleLabel}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#953002] text-sm font-bold text-white shadow-sm">
                  {initials || "U"}
                </div>

                <ChevronDown className="h-4 w-4 text-slate-400" />
              </div>
            </div>
          </header>

          {selectedNotification && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
              onClick={() => setSelectedNotification(null)}
            >
              <div
                className="w-[400px] overflow-hidden rounded-xl bg-white shadow-2xl animate-in fade-in zoom-in duration-200"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="p-6">
                  <div className="mb-4 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                      <FileText className="h-6 w-6 text-orange-700" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        {getNotificationTitle(selectedNotification.message)}
                      </h2>
                      <p className="text-xs text-gray-500">Document Notification</p>
                    </div>
                  </div>

                  <div className="mb-6 rounded-lg border border-slate-100 bg-slate-50 p-4">
                    <p className="text-sm leading-relaxed text-gray-700">
                      {selectedNotification.message}
                    </p>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedNotification(null)}
                      className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-slate-100"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}