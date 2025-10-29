export default function Footer() {
    return (
        <footer className="px-4 md:px-6 border-t-1 border-gray-200">
            <div className="flex flex-col items-center justify-center py-1">
                <div className="flex items-center gap-2 m-2">
                    <span className="text-xs">RacketFest</span>
                    <span className="text-xs px-2 py-1 rounded">© {new Date().getFullYear()}</span>
                </div>
            </div>
        </footer>
    )
}