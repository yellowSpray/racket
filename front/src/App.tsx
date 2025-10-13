import Header from '@/shared/components/layout/Header'
import Footer from '@/shared/components/layout/Footer'
import AppRouter from '@/routes/AppRouter'
import { AuthProvider } from '@/context/AuthProvider'

function App() {

  return (
    <>
      <AuthProvider>
        <Header />
        <main className="flex-1 grid grid-cols-12 gap-4">
          <AppRouter />
        </main>
        <Footer />
      </AuthProvider>
    </>
  )
}

export default App
