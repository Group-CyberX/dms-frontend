"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Search, Check, FileText, Clock } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

function TimeAgo({ date }: { date: string }) {
  const [time, setTime] = useState(formatDistanceToNow(new Date(date), { addSuffix: true }));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(formatDistanceToNow(new Date(date), { addSuffix: true }));
    }, 60000); // Update text every 60 seconds
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
  if (msg.includes("New login") || msg.includes("logged in")) return "New Login Detected";
  if (msg.includes("password") && msg.includes("changed")) return "Password Changed";
  
  return "System Alert"; // Default if no keywords match
}

export function Header() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
  const testUserId = "0b0f8543-672e-4a5a-bb8d-99da74f94f90";

  // fetch notification from the backend
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch(`http://localhost:8081/api/notifications?userId=${testUserId}`);
        const data = await response.json();
        console.log("NOTIFICATION DATA:", data[0]); // Look at the first notification in the console
        setNotifications(data);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();
    //Refresh every 5 seconds
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleNotificationClick = async (n: any) => {
  setSelectedNotification(n);

  if (!n.isRead) {
    try {
      const response = await fetch(`http://localhost:8081/api/notifications/${n.notificationId}/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        console.log("Database updated successfully!");
        setNotifications(prev => 
          prev.map(notif => 
            notif.notificationId === n.notificationId ? { ...notif, isRead: true, read: true } : notif
          )
        );
      }
    } catch (error) {
      console.error("Failed to mark as read", error);
    }
  }
};

// Mark all as read function
const handleMarkAllRead = async () => {
  try {
    const response = await fetch(`http://localhost:8081/api/notifications/mark-all-read?userId=${testUserId}`, {
      method: 'PUT',
    });

    if (response.ok) {
      // Update local state immediately so the UI reflects the change
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      console.log("All notifications marked as read");
    }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
    };
    useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
        // If the menu is open and the click is NOT inside the dropdownRef, close it
        if (isOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsOpen(false);
        }
    }

    // Bind the event listener
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        // Unbind the event listener on clean up
        document.removeEventListener("mousedown", handleClickOutside);
    };
    }, [isOpen]);

  return (
    <header className="flex flex-1 h-16 items-center justify-between border-b bg-white px-8">
      {/* Search Bar */}
      <div className="relative w-96">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input 
          type="text" 
          placeholder="Search documents, tasks, workflows..." 
          className="h-10 w-full rounded-md bg-slate-100 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#953002]"
        />
      </div>

      {/* Notification*/}
      <div className="flex items-center gap-4">
        <div className="relative" ref={dropdownRef}> {/* Container for the Dropdown positioning */}
  <button 
    onClick={() => setIsOpen(!isOpen)}
    className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
  >
    <Bell className="h-5 w-5 text-gray-600" />
    {/* Red Badge for the Bell - Only counts unread */}
    {notifications.filter(n => n.isRead === false).length > 0 && (
      <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#D4183D] text-[10px] text-white font-bold border-2 border-white">
        {notifications.filter(n => n.isRead === false).length}
      </span>
)}
  </button>

  {/* The dropdown menu*/}
  {isOpen && (
    <div className="absolute right-0 mt-3 w-80 bg-white border rounded-lg shadow-xl z-50 overflow-hidden">
      
      {/* Header of Dropdown */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-bold text-sm text-gray-800">Notifications</h3>
          <p>You have {notifications.filter(n => n.isRead === false).length} unread notifications</p>
        </div>
        <button 
         onClick={handleMarkAllRead}
        className="text-[11px] text-gray-500 hover:text-black flex items-center gap-1">
        <Check className="h-3 w-3" /> Mark all read
        </button>
      </div>

      {/* List of Notifications */}
      <div className="max-h-[350px] overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="p-10 text-center text-xs text-gray-400">No new notifications</p>
        ) : (
          notifications.map((n) => (
            <div 
                 key={n.notificationId} 
                 onClick={() => handleNotificationClick(n)}
                     // We use a template literal `` to combine standard classes and conditional ones
                     className={`flex gap-3 p-4 border-b hover:bg-slate-100 transition-colors relative ${!(n.isRead ?? n.read) ? 'bg-[#953002]/5' : 'bg-white'
            }`}
>
              {/* Icon Circle */}
              <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-orange-700" />
              </div>
              
              <div className="flex-1">
                   {/* Now uses the helper function to set the title dynamically */}
                   <p className="text-xs font-bold text-gray-800 leading-none">
                   {getNotificationTitle(n.message)}
                   </p>
  
                  <p className="text-[11px] text-gray-500 mt-1 leading-tight">{n.message}</p>
                 <p className="text-[10px] text-gray-400 mt-2">
                 {n.createdAt ? <TimeAgo date={n.createdAt} /> : "Just now"}
                 </p>
              </div>

              {/* The unread Brown Dot*/}
              {!(n.isRead ?? n.read) && (
               <div className="h-2 w-2 rounded-full bg-[#953002] absolute right-4 top-4" />
               )}
            </div>
          ))
        )}
      </div>

      {/* 3. Footer */}
      <button className="w-full p-3 text-xs font-medium text-gray-500 hover:bg-slate-50 border-t text-center">
        View all notifications
      </button>
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
      {/*Notification pop up*/}
      {selectedNotification && (
  <div 
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" 
    onClick={() => setSelectedNotification(null)}
  >
    {/* Notice: className quotes end, then onClick follows */}
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