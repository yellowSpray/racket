import { AppSideBar } from "@/shared/components/AppSidebar";
// import { Outlet } from "react-router";

export default function UserPage() {
  return (
    <div className="col-span-12 grid grid-cols-12 gap-4 px-4 pl-0 md:px-6 md:pl-0">
      <AppSideBar />

      {/* Zone de contenu dynamique */}
      <div className="col-start-3 col-span-10 flex-1 flex flex-col gap-4 py-4">

        {/* Ici le contenu change selon les routes */}
        {/* <Outlet /> */}

        {/* OU si tu n'utilises pas de nested routes : */}
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <div className="bg-muted/50 aspect-video rounded-xl" />
          <div className="bg-muted/50 aspect-video rounded-xl" />
          <div className="bg-muted/50 aspect-video rounded-xl" />
        </div>
        <div className="bg-muted/50 flex-1 rounded-xl" />

      </div>

    </div>
  );
}
