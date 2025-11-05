import { UserSideBar } from "@/components/user/UserSidebar";
import DashboardLayout from "@/layout/DashboardLayout";
import { Outlet } from "react-router";

export default function UserPage() {
  return (
    <DashboardLayout 
      sidebar={<UserSideBar/>}
      title=""
      filter={false}
    >
      <Outlet />
    </DashboardLayout>
  );
}
