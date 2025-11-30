import { Outlet } from "react-router";
import { AdminSideBar } from "@/components/admin/AdminSidebar";
import DashboardLayout from "@/layout/DashboardLayout";
import { PlayersProvider } from "@/contexts/PlayersContext";
import { EventProvider } from "@/contexts/EventContext";

export function AdminPageContent() {

  return (
    <DashboardLayout 
      sidebar={<AdminSideBar/>} 
    >
      <Outlet />
    </DashboardLayout>
  );

}

export default function AdminPage() {
  return (
    <EventProvider>
      <PlayersProvider>
        <AdminPageContent />
      </PlayersProvider>
    </EventProvider>
  );
}