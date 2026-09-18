import { Outlet } from "react-router";
import { AdminSideBar, AdminTabs } from "@/components/admin/AdminSidebar";
import DashboardLayout from "@/layout/DashboardLayout";
import { PlayersProvider } from "@/contexts/PlayersContext";

export default function AdminPage() {
  return (
    <PlayersProvider>
      <DashboardLayout sidebar={<AdminSideBar />} onglets={<AdminTabs />}>
        <Outlet />
      </DashboardLayout>
    </PlayersProvider>
  );
}