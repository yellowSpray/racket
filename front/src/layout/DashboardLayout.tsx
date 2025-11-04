import type { ReactNode } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from '@/components/ui/button';

export default function DashboardLayout({ sidebar, title, filter, children }: { sidebar?: ReactNode, children: ReactNode, title: string, filter: boolean }) {
    
    return (
    <div className="w-full flex-1 grid grid-cols-12">

        {sidebar && (
            <aside className="col-span-2 md:col-span-2 lg:col-span-2">
                {sidebar}
            </aside>
        )}

        {/* Zone de contenu dynamique */}
        <div className="w-full col-span-10 flex-1 flex flex-col">
            <section className="w-full flex items-center justify-between h-18 p-4 border-b border-gray-200">
                {title && (<h2>{title}</h2>)}                    
                {filter && (
                    <div className="flex flex-row gap-4">
                        <Button variant="ghost" className='border-1'>Ajout de joueur +</Button>
                        <Select name="filterPlayer">
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filtre" />
                            </SelectTrigger> 
                            <SelectContent className="bg-white">
                                <SelectGroup>
                                    <SelectItem value="active">Actif</SelectItem>
                                    <SelectItem value="inactive">Inactif</SelectItem>
                                    <SelectItem value="member">Membre</SelectItem>
                                    <SelectItem value="nonmember">Non Membre</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </section>
            <section className="p-4">
                {children}
            </section>
        </div>

    </div>
    )
}