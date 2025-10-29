import { useEffect, useState } from "react";
import { columns } from "./columns";
import type { PlayerType } from "./columns";
import { DataTable } from "./data-table";
import Loading from "../Loading";

async function getData(): Promise<PlayerType[]> {
    //TODO fetch data 

    return [
        {
            id: "skdufhsdkf43534liksdfn",
            first_name: "Rayan",
            last_name: "Lacante",
            email: "rayan@email.com",
            phone: "0498234567"
        },
        {
            id: "skdufhsdkf43534liksdfn",
            first_name: "Rayan",
            last_name: "Lacante",
            email: "rayan@email.com",
            phone: "0498234567"
        },
        {
            id: "skdufhsdkf43534liksdfn",
            first_name: "Rayan",
            last_name: "Lacante",
            email: "rayan@email.com",
            phone: "0498234567"
        },
        {
            id: "skdufhsdkf43534liksdfn",
            first_name: "Rayan",
            last_name: "Lacante",
            email: "rayan@email.com",
            phone: "0498234567"
        }
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
        <div className="container mx-auto py-10">
            <DataTable columns={columns} data={data} />
        </div>
    )
}