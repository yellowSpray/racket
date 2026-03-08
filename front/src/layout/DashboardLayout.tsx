import type { ReactNode } from 'react';

export default function DashboardLayout({
    sidebar,
    children,
}: {
    sidebar?: ReactNode,
    children: ReactNode,
}) {

    return (

    <div className="w-full flex-1 grid grid-cols-24 gap-8 min-h-0">

        {sidebar && (
            <aside className="col-span-2 2xl:col-span-3 h-full flex flex-col items-center rounded-xl border border-border p-1">
                {sidebar}
            </aside>
        )}

        <section className="w-full col-span-22 2xl:col-span-21 h-full flex flex-col min-h-0 pt-4">
            {children}
        </section>

    </div>
    )
}