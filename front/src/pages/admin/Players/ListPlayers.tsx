import { useEffect, useState } from "react";
import { columns } from "./columns";
import type { PlayerType } from "./columns";
import { DataTable } from "./data-table";
import Loading from "@/components/shared/Loading";

async function getData(): Promise<PlayerType[]> {
    //TODO fetch data 

    return [
        {
            id: "skdufhsdkf43534liksdfn",
            box: "1",
            full_name: "Rayan Lacante",
            phone: "0498234567",
            email: "rayan@email.com",
            arrival: "18:30",
            departure: "21:00",
            unavailable: ["10/10/25", "17/10/25"],
            status: ["active", "member"],
            power_ranking: "1400"
        },
        {
            id: "skdufhsdkf43534liksdfn",
            box: "1",
            full_name: "Peter Eade",
            phone: "0498234567",
            email: "peter@email.com",
            arrival: "19:30",
            departure: "none",
            unavailable: ["24/10/25"],
            status: ["inactive", "visitor", "unpaid"],
            power_ranking: "1225"
        },
        {
            id: "skdufhsdkf43534liksdfn",
            box: "1",
            full_name: "Renaud Vandenplas",
            phone: "0498234567",
            email: "renaud@email.com",
            arrival: "18:30",
            departure: "20:30",
            unavailable: [],
            status: ["active", "visitor", "paid"],
            power_ranking: "1300"
        },
        {
            id: "skdufhsdkf43534liksdfn",
            box: "1",
            full_name: "Charles Bouchat",
            phone: "0498234567",
            email: "charles@email.com",
            arrival: "18:30",
            departure: "20:00",
            unavailable: [],
            status: ["active", "member"],
            power_ranking: "1150"
        },
        {
            id: "skdufhsdkf43534liksdfn",
            box: "1",
            full_name: "Nicolas Debussche",
            phone: "0498234567",
            email: "nico@email.com",
            arrival: "20:00",
            departure: "none",
            unavailable: [],
            status: ["active", "member"],
            power_ranking: "1100"
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
        <DataTable columns={columns} data={data} />
    )
}