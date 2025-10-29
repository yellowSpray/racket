import { Outlet } from "react-router";
import Header from '@/components/shared/Header'
import Footer from '@/components/shared/Footer'

const Rootlayout = () => {

  return (
    <>
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center">
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

export default Rootlayout