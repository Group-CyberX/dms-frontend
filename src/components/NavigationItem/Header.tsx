"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Search, Check, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { NOTIFICATION_CONFIG } from "@/lib/constants";
import { Notification } from "@/types/notification";
import { notificationService } from "@/lib/notificationServices";

/*Helper component to handle dynamic time formatting.*/
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

/*logic for notification categorization.*/
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

export function Header() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [fetchError, setFetchError] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /*
   Notification Fetching logic.
   Utilizes the service layer and handles errors.
   */
  const fetchNotifications = async () => {
    try {
      const data = await notificationService.getAll();
      setNotifications(data);
      setFetchError(false);
    } catch (error) {
      console.error("Fetch failed:", error);
      setFetchError(true);
      setNotifications([]); 
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, NOTIFICATION_CONFIG.POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  /*Handler for marking individual notifications as read.*/
  const handleNotificationClick = async (n: Notification) => {
    setSelectedNotification(n);

    if (!n.isRead) {
      try {
        const success = await notificationService.markAsRead(n.notificationId);
        if (success) {
          setNotifications((prev) =>
            prev.map((notif) =>
              notif.notificationId === n.notificationId 
                ? { ...notif, isRead: true, read: true } 
                : notif
            )
          );
        }
      } catch (error) {
        console.error("Mark read failed:", error);
      }
    }
  };

  /*Handler for marking all notifications as read.*/
  const handleMarkAllRead = async () => {
    try {
      const success = await notificationService.markAllRead();
      if (success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch (error) {
      console.error("Mark all read failed:", error);
    }
  };

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;

  return (
    <header className="flex h-16 w-full items-center justify-between border-b bg-white px-6">
      {/* Search Bar Container */}
      <div className="flex items-center flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents, tasks, workflows..."
            className="h-10 w-full rounded-md bg-slate-100 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#953002]"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Notification Bell Section */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <Bell className="h-5 w-5 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#D4183D] text-[10px] text-white font-bold border-2 border-white">
                {unreadCount}
              </span>
            )}
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-3 w-80 bg-white border rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <h3 className="font-bold text-sm text-gray-800">Notifications</h3>
                  <p className="text-[11px] text-gray-500">
                    {fetchError ? "Connection Error" : `You have ${unreadCount} unread messages`}
                  </p>
                </div>
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-gray-500 hover:text-black flex items-center gap-1"
                >
                  <Check className="h-3 w-3" /> Mark all read
                </button>
              </div>

              <div className="max-h-[350px] overflow-y-auto">
                {fetchError ? (
                  <p className="p-10 text-center text-xs text-red-500">Failed to load notifications.</p>
                ) : unreadCount === 0 ? (
                  <p className="p-10 text-center text-xs text-gray-400">No new notifications</p>
                ) : (
                  notifications
                    .filter((n) => !n.isRead)
                    .map((n) => (
                      <div
                        key={n.notificationId}
                        onClick={() => handleNotificationClick(n)}
                        className={`flex gap-3 p-4 border-b hover:bg-slate-100 transition-colors relative ${
                          !(n.isRead ?? n.read) ? "bg-[#953002]/5" : "bg-white"
                        }`}
                      >
                        <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-orange-700" />
                        </div>

                        <div className="flex-1">
                          <p className="text-xs font-bold text-gray-800 leading-none">
                            {getNotificationTitle(n.message)}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-1 leading-tight">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-2">
                            {n.createdAt ? <TimeAgo date={n.createdAt} /> : "Just now"}
                          </p>
                        </div>

                        {!(n.isRead ?? n.read) && (
                          <div className="h-2 w-2 rounded-full bg-[#953002] absolute right-4 top-4" />
                        )}
                      </div>
                    ))
                )}
              </div>

              <Link href="/notifications" className="block w-full">
                <button className="w-full p-3 text-xs font-medium text-gray-500 hover:bg-slate-50 border-t text-center">
                  View all notifications
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* User profile */}
        <div className="flex items-center gap-3 border-l pl-6">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-800">Kamal Gunarathne</p>
            <p className="text-[11px] text-gray-500 uppercase tracking-tighter">System Administrator</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-[#953002] flex items-center justify-center text-white font-bold shadow-sm">
            KG
          </div>
        </div>
      </div>

      {/* Detail Pop-up Modal */}
      {selectedNotification && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedNotification(null)}
        >
          <div
            className="w-[400px] bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-orange-700" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {getNotificationTitle(selectedNotification.message)}
                  </h2>
                  <p className="text-xs text-gray-500">Document Notification</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {selectedNotification.message}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}