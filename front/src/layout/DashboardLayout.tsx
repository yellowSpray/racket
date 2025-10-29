import type { ReactNode } from 'react';

export default function DashboardLayout({ sidebar, title, children }: { sidebar?: ReactNode, children: ReactNode, title: string }) {
    return (
    <div className="w-full flex-1 grid grid-cols-12">
        
        {sidebar && (
            <div className="col-span-2 md:col-span-2 lg:col-span-2">
                {sidebar}
            </div>
        )}

        {/* Zone de contenu dynamique */}
        <div className="w-full col-span-10 flex-1 flex flex-col">
            <div className="w-full flex items-center h-18 pl-4 border-b border-gray-200">
                {title && <h2>{title}</h2>}
            </div>
            <div className="p-4">
                {children}
            </div>
        </div>

    </div>
    )
}