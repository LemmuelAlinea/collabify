import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import MobileSidebar from '../components/MobileSidebar'

function DashboardLayout({ title, pageTitle, navigation, children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#ffffff] text-white md:ml-64 pt-16">
      <Sidebar title={title} navigation={navigation} />

      <MobileSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        title={title}
        navigation={navigation}
      />

      <div className="flex-1 min-w-0">
        <Topbar
          pageTitle={pageTitle}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout