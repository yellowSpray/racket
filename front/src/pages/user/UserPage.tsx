import { UserSideBar } from "@/components/user/UserSidebar";
import DashboardLayout from "@/layout/DashboardLayout";
import { EventProvider } from "@/contexts/EventContext";
import { Outlet } from "react-router";

export default function UserPage() {
  return (
    <EventProvider>
      <DashboardLayout
        sidebar={<UserSideBar/>}
      >
        <Outlet />
      </DashboardLayout>
    </EventProvider>
  );
}
