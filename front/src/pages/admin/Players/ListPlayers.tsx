import { useEffect, useState } from "react";
import { columns } from "./columns";
import type { PlayerType } from "./columns";
import { DataTable } from "./data-table";
import Loading from "@/components/shared/Loading";
import { Badge } from "@/components/ui/Badge";

async function getData(): Promise<PlayerType[]> {
    //TODO fetch data 

    return [
        {
            id: "skdufhsdkf43534liksdfn",
            full_name: "Rayan Lacante",
            phone: "0498234567",
            email: "rayan@email.com",
            arrival: "18:30",
            departure: "21:00",
            unavailable: ["10/10/25", "17/10/25"],
            status: ["active", "member"],
        },
        {
            id: "skdufhsdkf43534liksdfn",
            full_name: "Rayan Lacante",
            phone: "0498234567",
            email: "rayan@email.com",
            arrival: "18:30",
            departure: "21:00",
            unavailable: ["17/10/25"],
            status: ["inactive", "visitor", "unpaid"],
        },
        {
            id: "skdufhsdkf43534liksdfn",
            full_name: "Rayan Lacante",
            phone: "0498234567",
            email: "rayan@email.com",
            arrival: "18:30",
            departure: "21:00",
            unavailable: ["10/10/25"],
            status: ["active", "visitor", "paid"],
        },
        {
            id: "skdufhsdkf43534liksdfn",
            full_name: "Rayan Lacante",
            phone: "0498234567",
            email: "rayan@email.com",
            arrival: "18:30",
            departure: "21:00",
            unavailable: [],
            status: ["active", "member"],
        },
        {
            id: "skdufhsdkf43534liksdfn",
            full_name: "Rayan Lacante",
            phone: "0498234567",
            email: "rayan@email.com",
            arrival: "18:30",
            departure: "21:00",
            unavailable: ["10/10/25", "17/10/25"],
            status: ["active", "member"],
        },
    ]
}

export default function ListPlayers() {

    const [data, setData] = useState<PlayerType[]>([])
    const [loading, setLoading] = useState<boolean>(true)

    useEffect(()=> {
        getData()
            .then(setData)
            .finally(() => setLoading(false))
    },[])

    if (loading) {
        return <Loading />
    }

    return (
        <div className="">
            <DataTable columns={columns} data={data} />
        </div>
    )
}