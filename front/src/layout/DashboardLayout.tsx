import type { ReactNode } from 'react';

export default function DashboardLayout({
    sidebar,
    children,
}: {
    sidebar?: ReactNode,
    children: ReactNode,
}) {

    return (

    <div className="w-full flex-1 grid grid-cols-24 gap-4 min-h-0">

        {sidebar && (
            <aside className="col-span-1 h-full flex flex-col items-center">
                {sidebar}
            </aside>
        )}

        <section className="w-full col-span-23 h-full flex flex-col min-h-0 pt-4">
            {children}
        </section>

    </div>
    )
}