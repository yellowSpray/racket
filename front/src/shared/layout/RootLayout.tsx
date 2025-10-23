import { Outlet } from "react-router";
import Header from '@/shared/components/Header'
import Footer from '@/shared/components/Footer'

const Rootlayout = () => {

  return (
    <>
      <Header />
      <main className="flex-1 grid grid-cols-12 gap-4">
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

export default Rootlayout