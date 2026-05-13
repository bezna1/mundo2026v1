import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { useAuth } from '@/hooks/useAuth'

export function Layout() {
  const { appUser } = useAuth()
  const isAdmin = appUser?.member.role === 'admin' || appUser?.member.role === 'owner'

  return (
    <div className="relative flex flex-col min-h-dvh gradient-hero">
      <Header />
      <main className="relative flex-1 container mx-auto max-w-5xl px-4 pt-5 md:pt-8 pb-28">
        <Outlet />
      </main>
      <BottomNav isAdmin={isAdmin} />
    </div>
  )
}
