import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <section className="flex h-lvh w-full flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
          <p className="text-muted-foreground">
            Une erreur inattendue s'est produite. Veuillez réessayer.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="bg-muted mt-4 max-w-lg overflow-auto rounded p-4 text-sm">
              {this.state.error.message}
            </pre>
          )}
          <Button onClick={this.handleRetry}>Réessayer</Button>
        </section>
      )
    }

    return this.props.children
  }
}
