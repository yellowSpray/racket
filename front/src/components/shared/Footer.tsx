export default function Footer() {
    return (
        <footer className="mt-[15px] w-full px-10">
            <div className="flex flex-row justify-center items-center gap-2 m-2">
                <span className="text-xs">RacketFest</span>
                <span className="text-xs px-2 py-1 rounded">© {new Date().getFullYear()}</span>
            </div>
        </footer>
    )
}