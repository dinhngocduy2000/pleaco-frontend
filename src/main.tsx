import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import ReactDOM from 'react-dom/client'
import { Provider as ReduxProvider } from 'react-redux'
import { RouteLoadingFallback } from './components/layouts/route_loading_fallback'
import { Toaster } from './components/ui/sonner'
import { queryClient } from './queries'
import { routeTree } from './routeTree.gen'
import { store } from './stores'

const isTest = import.meta.env.VITE_CI === 'true'
const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultPendingComponent: isTest ? undefined : RouteLoadingFallback,
  defaultPendingMs: isTest ? 500 : 0,
  defaultPendingMinMs: isTest ? 500 : 200,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('app')

if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        {/* <ReactQueryDevtools initialIsOpen={false} /> */}
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ReduxProvider>,
  )
}
