import { X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import logo from '../assets/collabify-logo.png'

function MobileSidebar({ isOpen, onClose, title, navigation }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <aside className="relative w-72 h-full bg-[#001A5A] border-r border-white/10 text-white">
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={logo}
              alt="Collabify"
              className="w-10 h-10 object-contain shrink-0"
            />

            <h1 className="text-lg font-black bg-gradient-to-r from-cyan-300 to-green-400 bg-clip-text text-transparent truncate">
              {title}
            </h1>
          </div>

          <button
            onClick={onClose}
            className="border border-white/20 rounded-xl p-2 hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="px-4 py-5 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-400 to-green-400 text-black shadow-lg'
                      : 'text-gray-200 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </aside>
    </div>
  )
}

export default MobileSidebar