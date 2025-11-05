import { useState } from "react";
import { Outlet } from "react-router";
import { AdminSideBar } from "@/components/admin/AdminSidebar";
import DashboardLayout from "@/layout/DashboardLayout";
import { PlayersProvider } from "@/contexts/PlayersProvider";
import { usePlayers } from "@/contexts/usePlayers";

export function AdminPageContent() {
  const { addPlayer } = usePlayers()
  const [title, setTitle] = useState<string>("")

  //TODO changer le filter true ou false  

  return (
    <DashboardLayout 
      sidebar={<AdminSideBar onTitleChange={setTitle} />} 
      title={title}
      filter={true}
      onAddPlayer={addPlayer}
    >
      <Outlet />
    </DashboardLayout>
  );

}

export default function AdminPage() {
  return (
    <PlayersProvider>
      <AdminPageContent />
    </PlayersProvider>
  );
}