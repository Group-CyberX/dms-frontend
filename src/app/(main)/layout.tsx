import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import NavigationSideBar from "@/components/NavigationItem/NavigationSideBar";
import { Header } from "@/components/NavigationItem/Header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <NavigationSideBar />
        
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center border-b px-4 h-16 bg-white">
            <SidebarTrigger />
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}