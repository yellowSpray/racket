import { useState } from "react";
import { Outlet } from "react-router";
import { AdminSideBar } from "@/components/admin/AdminSidebar";
import DashboardLayout from "@/layout/DashboardLayout";

export default function AdminPage() {

  const [title, setTitle] = useState<string>("")

  //TODO changer le filter true ou false  

  return (
    <DashboardLayout 
      sidebar={<AdminSideBar onTitleChange={setTitle} />} 
      title={title}
      filter={true}
    >
      <Outlet />
    </DashboardLayout>
  );

}
