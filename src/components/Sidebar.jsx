import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import logo from '../assets/collabify-logo.png'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

function Sidebar({ title, navigation }) {
  const navigate = useNavigate()
  const location = useLocation()

  const [expandedMenus, setExpandedMenus] = useState({})
  const [studentClasses, setStudentClasses] = useState([])
  const [teacherClasses, setTeacherClasses] = useState([])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchSidebarClasses()
  }, [])

  async function fetchSidebarClasses() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data: memberships } = await supabase
      .from('class_members')
      .select(`
        class_id,
        classes (
          id,
          class_name,
          section
        )
      `)
      .eq('student_id', user.id)

    if (memberships) {
      setStudentClasses(
        memberships
          .map((item) => item.classes)
          .filter(Boolean)
      )
    }

    const { data: teacherClassesData } = await supabase
      .from('classes')
      .select('id, class_name, section')
      .eq('teacher_id', user.id)

    if (teacherClassesData) {
      setTeacherClasses(teacherClassesData)
    }
  }

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col fixed left-0 top-0 h-screen border-r border-white/10 bg-[#001A5A] z-40">
      <div className="h-16 flex items-center px-5 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={logo}
            alt="Collabify"
            className="w-10 h-10 object-contain shrink-0"
          />

          <div className="min-w-0">
            <h1 className="text-lg font-black bg-gradient-to-r from-cyan-300 to-green-400 bg-clip-text text-transparent truncate">
              {title}
            </h1>
            <p className="text-xs text-gray-400 truncate">
              Collabify Workspace
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-5 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon
          const isExpanded = expandedMenus[item.label]

          return (
            <div key={item.label}>
              <button
                type="button"
                onClick={() => {
                  if (item.expandable) {
                    setExpandedMenus((prev) => ({
                      ...prev,
                      [item.label]: !prev[item.label],
                    }))
                  } else {
                    navigate(item.path)
                  }
                }}
                className={`group flex w-full items-center justify-between rounded-2xl px-4 py-3 transition-all ${
                  location.pathname.startsWith(item.path)
                    ? 'bg-gradient-to-r from-cyan-400 to-green-400 text-black'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} />
                  <span className="font-semibold">{item.label}</span>
                </div>

                {item.expandable &&
                  (isExpanded ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronRight size={18} />
                  ))}
              </button>

              {item.label === 'Classes' &&
                isExpanded &&
                location.pathname.startsWith('/student') && (
                  <div className="mt-2 ml-4 space-y-2">
                    <button
                      type="button"
                      onClick={() => navigate('/student/classes')}
                      className="w-full rounded-xl border border-cyan-300/20 bg-white/10 px-3 py-2 text-left text-sm font-bold text-cyan-300 transition-all hover:bg-white/20"
                    >
                      All Classes
                    </button>

                    {studentClasses.map((classItem) => (
                      <button
                        type="button"
                        key={classItem.id}
                        onClick={() =>
                          navigate(`/student/classes/${classItem.id}`)
                        }
                        className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-left transition-all hover:bg-white/20"
                      >
                        <p className="text-sm font-black text-white">
                          {classItem.class_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {classItem.section}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

              {item.label === 'Classes' &&
                isExpanded &&
                location.pathname.startsWith('/teacher') && (
                  <div className="mt-2 ml-4 space-y-2">
                    <button
                      type="button"
                      onClick={() => navigate('/teacher/classes')}
                      className="w-full rounded-xl border border-cyan-300/20 bg-white/10 px-3 py-2 text-left text-sm font-bold text-cyan-300 transition-all hover:bg-white/20"
                    >
                      All Classes
                    </button>

                    {teacherClasses.map((classItem) => (
                      <button
                        type="button"
                        key={classItem.id}
                        onClick={() =>
                          navigate(`/teacher/classes/${classItem.id}`)
                        }
                        className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-left transition-all hover:bg-white/20"
                      >
                        <p className="text-sm font-black text-white">
                          {classItem.class_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {classItem.section}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

export default Sidebar