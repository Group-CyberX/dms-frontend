"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import { canAccessFeature, type SidebarFeatureKey } from "@/lib/access-control";

import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "../ui/sidebar";

import {
  LayoutDashboard,
  FileText,
  Search,
  CheckSquare,
  Workflow,
  Trash2,
  ScrollText,
  Link2,
  Users,
  Shield,
  Activity,
  Settings,
  LogOut,
} from "lucide-react";

type NavItem = {
  title: string;
  url: string;
  icon: React.ReactNode;
  feature: SidebarFeatureKey;
};

export default function NavigationSideBar() {
  const pathname = usePathname();
  const role = useAuthStore((state) => state.role);
  const permissions = useAuthStore((state) => state.permissions);
  const router = useRouter();

  const items: NavItem[] = [
    { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboard size={18} />, feature: "dashboard" },
    { title: "Documents", url: "/documents", icon: <FileText size={18} />, feature: "documents" },
    { title: "Search", url: "/search", icon: <Search size={18} />, feature: "search" },
    { title: "My Tasks", url: "/my-tasks", icon: <CheckSquare size={18} />, feature: "myTasks" },
    { title: "Workflows", url: "/workflows", icon: <Workflow size={18} />, feature: "workflows" },
    { title: "Recycle Bin", url: "/recycle-bin", icon: <Trash2 size={18} />, feature: "recycleBin" },
    { title: "Audit Logs", url: "/audit", icon: <ScrollText size={18} />, feature: "auditLogs" },
    { title: "ERP Integration", url: "/erp", icon: <Link2 size={18} />, feature: "erpIntegration" },
    { title: "User Management", url: "/user-mgt", icon: <Users size={18} />, feature: "userManagement" },
    { title: "Role Management", url: "/role-mgt", icon: <Shield size={18} />, feature: "roleManagement" },
    { title: "System Health", url: "/system-health", icon: <Activity size={18} />, feature: "systemHealth" },
  ];

  const bottomItems: NavItem[] = [
    { title: "Settings", url: "/settings", icon: <Settings size={18} />, feature: "settings" },
    { title: "Logout", url: "/logout", icon: <LogOut size={18} />, feature: "settings" },
  ];

  const visibleItems = items.filter((item) =>
    canAccessFeature(item.feature, role, permissions)
  );

  const visibleBottomItems = bottomItems.filter((item) =>
    canAccessFeature(item.feature, role, permissions)
  );

  const isActive = (url: string) =>
    pathname === url || (url !== "/" && pathname.startsWith(url));

const buttonClass = (active: boolean) =>
  [
    "w-full justify-start gap-3 rounded-lg px-3 py-2 text-sm",
    "transition-colors",
    active
      ? "bg-[#8B2E00] text-white hover:bg-[#8B2E00] hover:text-white"
      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
  ].join(" ");

  //Handle logout with API call to invalidate refresh token
  const handleLogout = async () => {
    const logoutAsync = useAuthStore.getState().logoutAsync;
    await logoutAsync();
    router.push("/login");
  };

  return (
    <Sidebar className="bg-white border-r">
      <SidebarContent className="p-3 flex h-full flex-col overflow-y-auto overflow-x-hidden">
        {/* Brand  */}
        <div className="px-2 py-2 mb-2 flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-[#8B2E00] text-white flex items-center justify-center text-sm font-bold">
            DMS
          </div>
          <div className="font-semibold text-[#8B2E00]">Universal DMS</div>
        </div>

        <SidebarMenu className="flex-1">
          {visibleItems.map((item) => {
            const active = isActive(item.url);
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild className={buttonClass(active)}>
                  <Link href={item.url}>
                    {item.icon}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        <SidebarSeparator className="my-3" />

        <SidebarMenu>
          {visibleBottomItems.map((item) => {
            const active = isActive(item.url);
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild className={buttonClass(active)}>
                  {item.title === "Logout" ? (
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full"
                    >
                      {item.icon}
                      <span>{item.title}</span>
                    </button>
                  ) : (
                    <Link href={item.url}>
                      {item.icon}
                      <span>{item.title}</span>
                    </Link>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
