"use client";

import { useState, useEffect } from "react";
import { FileText, Search, Trash2, Bell, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { notificationService } from "@/lib/notificationServices";
import { Notification } from "@/types/notification";
import { useRouter } from "next/navigation";

export default function AllNotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]); 
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const data = await notificationService.getAll();
            setNotifications(data);
        } catch (error) {
            console.error("Failed to load notification history:", error);
            setNotifications([]); 
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // Logic to mark as read and show popup
    const handleNotificationClick = async (n: Notification) => {
        setSelectedNotification(n);

        if (!n.isRead) {
            try {
                const success = await notificationService.markAsRead(n.notificationId);
                if (success) {
                    // Update local state so it moves from 'unread' to 'read' section instantly
                    setNotifications((prev) =>
                        prev.map((notif) =>
                            notif.notificationId === n.notificationId 
                                ? { ...notif, isRead: true } 
                                : notif
                        )
                    );
                }
            } catch (error) {
                console.error("Mark read failed:", error);
            }
        }
    };

    const filteredNotifications = notifications.filter(n => {
        const title = ((n as any).title || "").toLowerCase(); 
        const message = n.message.toLowerCase();
        const query = searchQuery.toLowerCase();

        const matchesSearch = title.includes(query) || message.includes(query);
        const matchesTab = 
            filter === 'all' ? true : 
            filter === 'unread' ? !n.isRead : n.isRead;

        return matchesSearch && matchesTab;
    });

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent opening the modal when clicking delete
        try {
            await notificationService.delete(id); 
            setNotifications(prev => prev.filter(n => n.notificationId !== id));
        } catch (error) {
            console.error("Failed to delete notification:", error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Back button */}
                <button 
                    onClick={() => router.back()}
                    className="group flex items-center gap-2 text-[#953002] hover:opacity-80 transition-all mb-[-8px]"
                >
                    <ArrowLeft className="h-5 w-5" />
                    <span className="text-xl font-medium">Back</span>
                </button>

                <div>
                    <h1 className="text-3xl font-bold text-[#953002]">Notifications</h1>
                    <p className="text-gray-500 text-sm">Stay updated with all your important notifications</p>
                </div>

                {/* Search bar */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search notifications..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-1 focus:ring-[#953002] outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 bg-white p-2 rounded-lg w-fit border shadow-sm">
                    {(['all', 'unread', 'read'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className={`px-6 py-1 rounded-lg text-sm transition-all ${
                                filter === tab 
                                ? 'bg-[#953002] text-white shadow-md' 
                                : 'text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Notifications List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {filteredNotifications.length === 0 ? (
                        <div className="p-20 text-center space-y-2">
                            <Bell className="h-10 w-10 text-gray-200 mx-auto" />
                            <p className="text-gray-400 text-sm">No notifications found</p>
                        </div>
                    ) : (
                        filteredNotifications.map((n) => (
                            <div 
                                key={n.notificationId} 
                                onClick={() => handleNotificationClick(n)}
                                className="group p-6 border-b border-gray-50 last:border-none flex gap-4 items-start hover:bg-gray-50 cursor-pointer transition-colors relative"
                            >
                                <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 border ${
                                    n.isRead ? 'bg-gray-50 border-gray-100' : 'bg-orange-50 border-orange-100'
                                }`}>
                                    <FileText className={`h-6 w-6 ${n.isRead ? 'text-gray-400' : 'text-[#953002]'}`} />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className={`text-sm ${n.isRead ? 'font-medium text-gray-500' : 'font-bold text-gray-800'}`}>
                                            {(n as any).title} 
                                        </h3>
                                        <button 
                                            onClick={(e) => handleDelete(e, n.notificationId)}
                                            className="text-red-500 hover:text-red-700 transition-colors p-1"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <p className={`text-sm leading-relaxed ${n.isRead ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {n.message}
                                    </p>
                                    <p className="text-[11px] text-gray-400 font-medium">
                                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                    </p>
                                </div>
                                {!n.isRead && (
                                    <div className="h-2 w-2 rounded-full bg-[#953002] absolute right-4 top-1/2 -translate-y-1/2" />
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Reusable Pop-up Modal Style from Header */}
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
                                        {(selectedNotification as any).title || "Notification"}
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
        </div>
    );
}