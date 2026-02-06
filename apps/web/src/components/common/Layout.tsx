import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/mulligan', label: 'Mulligan Simulator', enabled: true },
  { to: '/hand-reading', label: 'Hand Reading', enabled: false },
  { to: '/profile', label: 'Profile', enabled: false },
];

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-gray-700 bg-gray-800" aria-label="Main navigation">
        <div className="max-w-6xl mx-auto px-4 flex items-center h-14 gap-6">
          <span className="text-lg font-bold text-white tracking-tight">MTG Companion</span>
          <div className="flex gap-1">
            {navItems.map((item) =>
              item.enabled ? (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ) : (
                <span
                  key={item.to}
                  className="px-3 py-2 rounded text-sm font-medium text-gray-600 cursor-not-allowed"
                  role="link"
                  aria-disabled="true"
                  title="Coming soon"
                >
                  {item.label}
                </span>
              ),
            )}
          </div>
        </div>
      </nav>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
