// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { AuthProvider } from '@/contexts/AuthContext'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Toaster } from 'sonner'
import { CheckmarkCircle02Icon, Alert02Icon, InformationCircleIcon, AlertDiamondIcon } from 'hugeicons-react'
import '@/index.css'
import router from './routes'

createRoot(document.getElementById('root')!).render(
  // <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster
          position="top-center"
          richColors
          duration={4000}
          icons={{
            success: <CheckmarkCircle02Icon size={18} />,
            error: <Alert02Icon size={18} />,
            warning: <AlertDiamondIcon size={18} />,
            info: <InformationCircleIcon size={18} />,
          }}
          toastOptions={{
            className: 'justify-center text-center',
            style: { width: 'fit-content', maxWidth: '90vw' },
          }}
        />
      </AuthProvider>
    </ErrorBoundary>
  // </StrictMode>
)
