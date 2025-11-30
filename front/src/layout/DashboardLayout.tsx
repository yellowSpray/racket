import type { ReactNode } from 'react';

export default function DashboardLayout({ 
    sidebar, 
    children,
}: { 
    sidebar?: ReactNode, 
    children: ReactNode, 
}) {
    
    return (

    <div className="w-full flex-1 grid grid-cols-12">

        {sidebar && (
            <aside className="col-span-2 md:col-span-2 lg:col-span-2">
                {sidebar}
            </aside>
        )}

        <section className="w-full col-span-10 p-4">
            {children}
        </section>

    </div>
    )
}