import { Outlet, useLocation } from "react-router";
import Header from '@/components/shared/Header'
import Footer from "@/components/shared/Footer"

const Rootlayout = () => {
  const location = useLocation()
  const showFooter = location.pathname === "/" || location.pathname === "/auth"
  const isApp = location.pathname.startsWith('/admin') || location.pathname.startsWith('/user')

  return (
    <>
      <Header />
      <main className={`flex-1 flex flex-col min-h-0 w-full px-10 ${isApp ? 'pb-10' : ''}`}>
        <Outlet />
      </main>
      {showFooter && <Footer />}
    </>
  )
}

export default Rootlayout