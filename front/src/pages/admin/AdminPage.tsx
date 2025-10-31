import { useState } from "react";
import { Outlet } from "react-router";
import { AdminSideBar } from "@/components/admin/AdminSidebar";
import DashboardLayout from "@/layout/DashboardLayout";

export default function AdminPage() {

  const [title, setTitle] = useState<string>("")

  return (
    <DashboardLayout 
      sidebar={<AdminSideBar onTitleChange={setTitle} />} 
      title={title}
    >
      <Outlet />
    </DashboardLayout>
  );

}
