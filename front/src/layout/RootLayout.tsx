import { Outlet, useLocation } from "react-router";
import Header from '@/components/shared/Header'
import Footer from "@/components/shared/Footer"
import { HeaderSlotProvider } from "@/contexts/HeaderSlotContext"
import { EventProvider } from "@/contexts/EventContext"

const Rootlayout = () => {
  const location = useLocation()
  const showFooter = location.pathname === "/" || location.pathname === "/auth"
  const isApp = location.pathname.startsWith('/admin') || location.pathname.startsWith('/user')
  const isAuth = location.pathname.startsWith('/auth')

  return (
    <EventProvider>
    <HeaderSlotProvider>
      {!isAuth && <Header />}
      <main className={`flex-1 flex flex-col min-h-0 w-full px-8 ${isApp ? 'pb-8' : ''} ${isAuth ? 'pt-8' : ''}`}>
        <Outlet />
      </main>
      {showFooter && <Footer />}
    </HeaderSlotProvider>
    </EventProvider>
  )
}

export default Rootlayout