import Login from "@/pages/Auth/Login";
// import Register from "@/pages/Auth/Register";

export default function Auth() {
    return (
        <section className="col-span-12 flex-1 flex flex-row items-center justify-center px-4 md:px-6">
            <Login />
            {/* //TODO faire le register avec animation */}
            {/* <Register /> */}
        </section>
    )
}