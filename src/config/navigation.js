import {
  LayoutDashboard,
  BookOpen,
  CheckSquare,
  BarChart3,
  User,
  // eslint-disable-next-line no-unused-vars
  Users,
  ClipboardCheck,
  Repeat,
  Shield,
  Activity,
  FileText,
  Wrench,
} from 'lucide-react'

export const studentNavigation = [
  {
    label: 'Dashboard',
    path: '/student/dashboard',
    icon: LayoutDashboard,
  },
{
  label: 'Classes',
  path: '/student/classes',
  icon: BookOpen,
  expandable: true,
},
  {
    label: 'Tasks',
    path: '/student/tasks',
    icon: CheckSquare,
  },
  {
    label: 'Analytics',
    path: '/student/analytics',
    icon: BarChart3,
  },
  {
    label: 'Evaluations',
    path: '/student/evaluations',
    icon: FileText,
  },
  {
    label: 'Profile',
    path: '/student/settings',
    icon: User,
  },
]

export const teacherNavigation = [
  {
    label: 'Dashboard',
    path: '/teacher/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Classes',
    path: '/teacher/classes',
    icon: BookOpen,
    expandable: true,
  },

  {
    label: 'Analytics',
    path: '/teacher/analytics',
    icon: BarChart3,
  },
  {
    label: 'Evaluation',
    path: '/teacher/evaluation',
    icon: ClipboardCheck,
  },
  {
    label: 'Reassignments',
    path: '/teacher/reassignments',
    icon: Repeat,
  },
  {
    label: 'Reports',
    path: '/teacher/reports',
    icon: FileText,
  },
  {
    label: 'Profile',
    path: '/teacher/settings',
    icon: User,
  },
]

export const adminNavigation = [
  {
    label: 'Dashboard',
    path: '/admin/dashboard',
    icon: Shield,
  },
  {
    label: 'System Monitoring',
    path: '/admin/monitoring',
    icon: Activity,
  },
  {
    label: 'Reports',
    path: '/admin/reports',
    icon: FileText,
  },
  {
    label: 'Maintenance',
    path: '/admin/maintenance',
    icon: Wrench,
  },
  {
    label: 'Profile',
    path: '/admin/settings',
    icon: User,
  },
]