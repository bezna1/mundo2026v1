import { useEffect } from 'react'
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import { AuthContext, useAuth, useAuthProvider } from '@/hooks/useAuth'
import { Layout } from '@/components/layout/Layout'
import { InvitePage } from '@/pages/InvitePage'
import { DashboardPage } from '@/pages/DashboardPage'
import { MatchesPage } from '@/pages/MatchesPage'
import { MatchDetailsPage } from '@/pages/MatchDetailsPage'
import { LeaderboardPage } from '@/pages/LeaderboardPage'
import { BonusesPage } from '@/pages/BonusesPage'
import { StatsPage } from '@/pages/StatsPage'
import { AdminPage } from '@/pages/AdminPage'
import { RulesPage } from '@/pages/RulesPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const { appUser, loading } = useAuth()
  const groupSlug =
    appUser?.group.slug ??
    localStorage.getItem('mt_group_slug') ??
    import.meta.env.VITE_DEFAULT_GROUP_SLUG ??
    ''

  useEffect(() => {
    if (!loading && !appUser) {
      navigate(`/?g=${groupSlug}`, { replace: true })
    }
  }, [loading, appUser, navigate, groupSlug])

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      </div>
    )
  }

  return appUser ? <>{children}</> : null
}

function AppProviders({ children }: { children: React.ReactNode }) {
  const [searchParams] = useSearchParams()
  const groupSlug =
    searchParams.get('g') ??
    (window.location.pathname !== '/'
      ? localStorage.getItem('mt_group_slug') ?? import.meta.env.VITE_DEFAULT_GROUP_SLUG ?? ''
      : '')

  const authValue = useAuthProvider(groupSlug)

  useEffect(() => {
    if (authValue.appUser?.group.slug) {
      localStorage.setItem('mt_group_slug', authValue.appUser.group.slug)
    }
  }, [authValue.appUser?.group.slug])

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <AppProviders>
        <InvitePage />
      </AppProviders>
    ),
  },
  {
    path: '/',
    element: (
      <AppProviders>
        <RequireAuth>
          <Layout />
        </RequireAuth>
      </AppProviders>
    ),
    children: [
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'matches', element: <MatchesPage /> },
      { path: 'matches/:matchId', element: <MatchDetailsPage /> },
      { path: 'leaderboard', element: <LeaderboardPage /> },
      { path: 'bonuses', element: <BonusesPage /> },
      { path: 'stats', element: <StatsPage /> },
      { path: 'rules', element: <RulesPage /> },
      { path: 'admin', element: <AdminPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])

export function App() {
  return <RouterProvider router={router} />
}
