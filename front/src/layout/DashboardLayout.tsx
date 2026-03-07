import type { ReactNode } from 'react';

export default function DashboardLayout({
    sidebar,
    children,
}: {
    sidebar?: ReactNode,
    children: ReactNode,
}) {

    return (

    <div className="w-full flex-1 grid grid-cols-15 gap-[15px] min-h-0">

        {sidebar && (
            <aside className="col-span-1 h-full flex flex-col rounded-full border border-border w-fit">
                {sidebar}
            </aside>
        )}

        <section className="w-full col-span-14 h-full flex flex-col min-h-0 pt-7.5">
            {children}
        </section>

    </div>
    )
}