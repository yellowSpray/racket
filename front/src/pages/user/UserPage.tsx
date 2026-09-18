import { UserSideBar, UserTabs } from "@/components/user/UserSidebar";
import DashboardLayout from "@/layout/DashboardLayout";
import { Outlet } from "react-router";

export default function UserPage() {
  return (
    <DashboardLayout sidebar={<UserSideBar />} onglets={<UserTabs />}>
      <Outlet />
    </DashboardLayout>
  );
}
