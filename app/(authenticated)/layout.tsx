import { Nav } from '@/components/layout/nav'
import { SkipLink } from '@/components/ui/skip-link'

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen flex flex-col">
      <SkipLink href="#main-content" />
      <Nav />
      <main id="main-content" className="flex-1 overflow-y-auto" tabIndex={-1}>
        {children}
      </main>
    </div>
  )
}
