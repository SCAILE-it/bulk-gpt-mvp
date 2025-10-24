import { Nav } from '@/components/layout/nav'

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen flex flex-col">
      <Nav />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
