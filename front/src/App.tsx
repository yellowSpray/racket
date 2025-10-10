import Header from '@/shared/components/layout/Header'
import Footer from '@/shared/components/layout/Footer'
import AppRouter from '@/routes/AppRouter'
import { AuthProvider } from './context/AuthContext'

function App() {

  return (
    <>
      <AuthProvider>
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6">
          <AppRouter />
        </main>
        <Footer />
      </AuthProvider>
    </>
  )
}

export default App
