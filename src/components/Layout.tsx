import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  CreditCard,
  BarChart3,
  MapPin,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/inquilinos', label: 'Inquilinos', icon: Users },
  { to: '/imoveis', label: 'Imóveis', icon: Building2 },
  { to: '/contratos', label: 'Contratos', icon: FileText },
  { to: '/pagamentos', label: 'Pagamentos', icon: CreditCard },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/terrenos', label: 'Terrenos', icon: MapPin },
]

export default function Layout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-slate-200 fixed h-full z-10">
        <div className="p-5 border-b border-slate-200">
          <h1 className="text-lg font-bold text-blue-700 flex items-center gap-2">
            <Building2 size={22} /> Gestão de Aluguéis
          </h1>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-bold text-blue-700 flex items-center gap-2">
          <Building2 size={18} /> Gestão de Aluguéis
        </h1>
        <button onClick={() => setOpen(!open)} className="p-1 text-slate-600">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-10 bg-black/40" onClick={() => setOpen(false)}>
          <aside className="w-60 bg-white h-full p-3 pt-16 space-y-1" onClick={e => e.stopPropagation()}>
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-60 pt-14 md:pt-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
