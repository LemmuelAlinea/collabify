import {
  LayoutDashboard,
  BarChart3,
  Bot,
  HardDrive,
  FileText,
  User,
} from 'lucide-react'

export const adminNavigation = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Platform Analytics', path: '/admin/analytics', icon: BarChart3 },
  { label: 'AI Monitoring', path: '/admin/ai-monitoring', icon: Bot },
  { label: 'Storage', path: '/admin/storage', icon: HardDrive },
  { label: 'Reports', path: '/admin/reports', icon: FileText },
  { label: 'Profile', path: '/admin/profile', icon: User },
]