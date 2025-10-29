import { AppSideBar } from "@/shared/components/AppSidebar";
import { Outlet } from "react-router";

export default function AdminPage() {
  return (
    <div className="col-span-12 grid grid-cols-12 gap-4 px-4 pl-0 md:px-6 md:pl-0">
      <AppSideBar />

      {/* Zone de contenu dynamique */}
      <div className="col-start-3 col-span-10 flex-1 flex flex-col gap-4 py-4">

        <Outlet />

      </div>

    </div>
  );
}
