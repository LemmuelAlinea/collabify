import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  BarChart3,
  UserCheck,
  User,
} from 'lucide-react'

export const generalManagerNavigation = [
  {
    label: 'Dashboard',
    path: '/general/manager/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Projects',
    path: '/general/manager/projects',
    icon: FolderKanban,
  },

  {
    label: 'Analytics',
    path: '/general/manager/analytics',
    icon: BarChart3,
  },
  {
    label: 'Evaluation',
    path: '/general/manager/evaluation',
    icon: UserCheck,
  },
  {
    label: 'Reports',
    path: '/general/manager/reports',
    icon: BarChart3,
  },
  {
    label: 'Profile',
    path: '/general/manager/settings',
    icon: User,
  },
]

export const generalSponsorNavigation = [
  {
    label: 'Dashboard',
    path: '/general/sponsor/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Projects',
    path: '/general/sponsor/projects',
    icon: FolderKanban,
  },
  {
    label: 'Approvals',
    path: '/general/sponsor/approvals',
    icon: UserCheck,
  },
  {
    label: 'Reports',
    path: '/general/sponsor/reports',
    icon: BarChart3,
  },
  {
    label: 'Profile',
    path: '/general/sponsor/settings',
    icon: User,
  },
]

export const generalMemberNavigation = [
  {
    label: 'Dashboard',
    path: '/general/member/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Projects',
    path: '/general/member/projects',
    icon: FolderKanban,
  },
  {
    label: 'Tasks',
    path: '/general/member/tasks',
    icon: CheckSquare,
  },
  
  {
    label: 'Analytics',
    path: '/general/member/analytics',
    icon: BarChart3,
  },
  {
    label: 'Profile',
    path: '/general/member/settings',
    icon: User,
  },
]