import { AdminSideBar } from "@/components/admin/AdminSidebar";
import DashboardLayout from "@/layout/DashboardLayout";
import { Outlet } from "react-router";

export default function AdminPage() {
  return (
    <DashboardLayout sidebar={<AdminSideBar/>} title="test" >
      <Outlet />
    </DashboardLayout>
  );
}
