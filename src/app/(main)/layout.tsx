import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import NavigationSideBar from "@/components/NavigationItem/NavigationSideBar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <NavigationSideBar />
      <SidebarTrigger />
      {children}
    </SidebarProvider>
  );
}