import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { teacherNavigation } from '../../../config/navigation'
import { supabase } from '../../../lib/supabaseClient'

function TeacherClassesPage() {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    fetchClasses()
  }, [])

  async function fetchClasses() {
    setLoading(true)
    setMessage('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage('Unable to get current user.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      setMessage(error.message)
      setLoading(false)
      return
    }

    const classesWithCounts = await Promise.all(
      (data || []).map(async (item) => {
        const { data: memberCount } = await supabase.rpc(
          'get_class_member_count',
          {
            class_uuid: item.id,
          }
        )

        const { data: groupCount } = await supabase.rpc(
          'get_class_group_count',
          {
            class_uuid: item.id,
          }
        )

        return {
          ...item,
          member_count: memberCount || 0,
          group_count: groupCount || 0,
        }
      })
    )

    setClasses(classesWithCounts)
    setLoading(false)
  }

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="Classes"
      navigation={teacherNavigation}
    >
      <div className="space-y-6 text-gray-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
              Classes
            </h1>

            <p className="mt-2 max-w-3xl text-gray-500">
              Manage your classes, class codes, members, and groups.
            </p>
          </div>

          <Link
            to="/teacher/classes/create"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 text-sm font-black text-black transition-all hover:opacity-90"
          >
            + Create Class
          </Link>
        </div>

        {message && (
          <div className="rounded-2xl border border-gray-400 bg-gray-50 p-4 text-sm text-gray-700">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading classes...</p>
        ) : classes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-8 text-center text-gray-500">
            No classes yet. Create your first class.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {classes.map((item) => (
              <Link
                key={item.id}
                to={`/teacher/classes/${item.id}`}
                className="group rounded-3xl border border-gray-400 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words text-xl font-black text-gray-900 group-hover:text-[#00B8B0]">
                      {item.class_name}
                    </h2>

                    <p className="mt-1 text-sm font-semibold text-gray-500">
                      {item.section}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full border border-[#00CFC8]/40 bg-white px-3 py-1 text-xs font-semibold text-[#00B8B0]">
                    {item.class_code}
                  </span>
                </div>

                {item.description && (
                  <p className="mt-4 line-clamp-2 text-sm text-gray-600">
                    {item.description}
                  </p>
                )}

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                    <p className="text-gray-500">Academic Year</p>
                    <p className="mt-1 font-bold text-gray-900">
                      {item.academic_year || 'N/A'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                    <p className="text-gray-500">Semester</p>
                    <p className="mt-1 font-bold text-gray-900">
                      {item.semester || 'N/A'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                    <p className="text-gray-500">Members</p>
                    <p className="mt-1 font-bold text-gray-900">
                      {item.member_count}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                    <p className="text-gray-500">Groups</p>
                    <p className="mt-1 font-bold text-gray-900">
                      {item.group_count}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-4">
                  <p className="text-xs text-gray-500">
                    Open class details
                  </p>

                  <span className="text-sm font-semibold text-[#00B8B0]">
                    Open Class
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default TeacherClassesPage