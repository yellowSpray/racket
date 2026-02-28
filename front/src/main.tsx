// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { AuthProvider } from '@/contexts/AuthContext'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import '@/index.css'
import router from './routes'

createRoot(document.getElementById('root')!).render(
  // <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorBoundary>
  // </StrictMode>
)
