import Login from "@/pages/Auth/Login";
// import Register from "@/pages/Auth/Register";

export default function Auth() {
    return (
        <section className="w-full flex-1 flex flex-row items-center justify-center">
            <Login />
            {/* //TODO faire le register avec animation */}
            {/* <Register /> */}
        </section>
    )
}