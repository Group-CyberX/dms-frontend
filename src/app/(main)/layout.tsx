"use client";

import { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import NavigationSideBar from "@/components/NavigationItem/NavigationSideBar";
import { formatRoleLabel, canAccessPath } from "@/lib/access-control";
import { useAuthStore, setupCrossWindowLogoutDetection } from "@/store/auth-store";
import { notificationService } from "@/lib/notificationServices";
import { apiClient } from "@/lib/api-client";
import { Bell, Check, FileText, Search, ChevronDown, User, Settings, LogOut } from "lucide-react";
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
  const userName = useAuthStore((state) => state.userName);
  const role = useAuthStore((state) => state.role);
  const permissions = useAuthStore((state) => state.permissions);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const profilePicture = useAuthStore((state) => state.profilePicture);
  const setProfilePicture = useAuthStore((state) => state.setProfilePicture);

  const [hydrated, setHydrated] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);

  useLayoutEffect(() => {
    hydratedRef.current = true;
    setHydrated(true);
  }, []);

  // Setup cross-window logout detection
  useEffect(() => {
    const cleanup = setupCrossWindowLogoutDetection();
    return cleanup;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;

    if (!hasHydrated) {
      return;
    }

    if (!token) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!canAccessPath(pathname, role, permissions)) {
      router.replace("/unauthorized");
    }
  }, [token, pathname, role, permissions, router, hasHydrated]);

  const displayName = useMemo(() => {
    // Prefer the actual username from the database
    if (userName) return userName;
    // Fallback: derive from email only if no username is available
    if (!email) return "User";
    const [left] = email.split("@");
    return left
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }, [userName, email]);

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
    if (!hydrated || !token) {
      setNotifications([]);
      setIsNotificationOpen(false);
      return;
    }

    let cancelled = false;

    const fetchNotifications = async () => {
      if (cancelled) return;
      try {
        const data = await notificationService.getAll();
        if (!cancelled) {
          setNotifications(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) {
          setNotifications([]);
        }
      }
    };

    const fetchProfile = async () => {
      try {
        const data = await apiClient.get("/api/profile");
        if (data && data.profilePicture) {
          setProfilePicture(data.profilePicture);
        }
      } catch (err) {
        console.error("Failed to fetch profile picture", err);
      }
    };

    fetchProfile();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [hydrated, token, setProfilePicture]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isNotificationOpen && notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
      if (isProfileOpen && profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isNotificationOpen, isProfileOpen]);

  const unreadCount = notifications.filter((notification) => !(notification.isRead ?? notification.read)).length;

  const handleNotificationClick = async (notification: NotificationItem) => {
    setSelectedNotification(notification);

    if (!(notification.isRead ?? notification.read)) {
      try {
        const success = await notificationService.markAsRead(notification.notificationId);

        if (success) {
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
      const success = await notificationService.markAllRead();

      if (success) {
        setNotifications((previous) => previous.map((item) => ({ ...item, isRead: true, read: true })));
      }
    } catch {
      // No-op: keep the dropdown usable.
    }
  };

  if (!hydrated) {
    return null;
  }

  if (!hasHydrated) {
    return null;
  }

  if (!token) {
    return null;
  }


  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-[#ececec]">
        <NavigationSideBar />
        
        <div className="flex flex-col flex-1 overflow-hidden">
          
          {/* Refactored Header Component */}
          <header className="flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-6">
            {/* Left Side: Sidebar Trigger */}
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-slate-700 hover:bg-slate-100" />
            </div>

            {/* Center: Search Bar Container */}
            <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search documents, tasks, workflows..."
                  className="h-10 w-full rounded-md bg-slate-100 pl-10 pr-4 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:ring-1 focus:ring-[#953002] border-0"
                />
              </div>
            </div>

            {/* Right Side: Actions & Profile */}
            <div className="flex items-center gap-6">
              {/* Notification Bell Section */}
              <div className="relative" ref={notificationRef}>
                <button
                    type="button"
                    onClick={() => setIsNotificationOpen((previous) => !previous)}
                    className="relative p-2 rounded-full text-slate-600 transition hover:bg-slate-100 flex items-center justify-center"
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-700 bg-opacity-0 px-1 text-[10px] font-bold text-white border-2 border-white translate-x-1/2 -translate-y-1/2 z-10">
                        {unreadCount}
                      </span>
                    )}{unreadCount > 0 && (
                        <span 
                          style={{ backgroundColor: '#dc2626', opacity: 1 }}
                          className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white border-2 border-white translate-x-1/2 -translate-y-1/2 z-20"
                        >
                          {unreadCount}
                      </span>
                      )}
                </button>

                {/* Dropdown Menu */}
                {isNotificationOpen && (
                  <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-lg border bg-white shadow-xl z-50">
                    <div className="flex items-center justify-between border-b p-4">
                      <div>
                        <h3 className="text-sm font-bold text-gray-800">Notifications</h3>
                        <p className="text-[11px] text-gray-500">
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
                              className={`relative flex gap-3 border-b p-4 transition-colors hover:bg-slate-100 cursor-pointer ${
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

                    <Link href="/notifications" className="block w-full">
                      <button
                        type="button"
                        className="w-full border-t p-3 text-center text-xs font-medium text-gray-500 hover:bg-slate-50"
                      >
                        View all notifications
                      </button>
                    </Link>
                  </div>
                )}
              </div>

              <div className="relative border-l border-slate-200 pl-4" ref={profileRef}>
                <div 
                  className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1 rounded-md transition-colors"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                >
                  <div className="hidden text-right leading-tight sm:block">
                    <p className="text-[15px] font-medium text-slate-800">{displayName}</p>
                    <p className="text-[11px] font-medium uppercase tracking-tight text-slate-500">
                      {roleLabel}
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#953002] text-sm font-bold text-white shadow-sm">
                    {profilePicture ? (
                      <img src={profilePicture} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      initials || "U"
                    )}
                  </div>

                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isProfileOpen ? "rotate-180" : ""}`} />
                </div>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-3 w-48 overflow-hidden rounded-lg border bg-white shadow-xl z-50">
                    <div className="border-b bg-gray-50 px-4 py-2">
                      <p className="text-xs font-medium uppercase text-gray-500">My Account</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <User className="h-4 w-4 text-gray-500" />
                        Profile
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <Settings className="h-4 w-4 text-gray-500" />
                        Settings
                      </Link>
                    </div>
                    <div className="border-t py-1">
                      <button
                        type="button"
                        onClick={() => {
                          useAuthStore.getState().logout();
                          router.push("/login");
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <LogOut className="h-4 w-4 text-gray-500" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
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