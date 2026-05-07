import { Outlet } from "react-router";
import { AdminSideBar } from "@/components/admin/AdminSidebar";
import DashboardLayout from "@/layout/DashboardLayout";
import { PlayersProvider } from "@/contexts/PlayersContext";

export default function AdminPage() {
  return (
    <PlayersProvider>
      <DashboardLayout sidebar={<AdminSideBar />}>
        <Outlet />
      </DashboardLayout>
    </PlayersProvider>
  );
}