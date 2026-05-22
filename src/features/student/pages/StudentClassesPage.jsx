import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../../layouts/DashboardLayout'
import { studentNavigation } from '../../../config/navigation'
import { supabase } from '../../../lib/supabaseClient'
import JoinClassModal from '../components/JoinClassModal'

function StudentClassesPage() {
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJoinedClasses()
  }, [])

  async function fetchTeacherName(teacherId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', teacherId)
      .maybeSingle()

    if (error || !data) {
      console.error(error)
      return 'N/A'
    }

    return `${data.first_name || ''} ${data.last_name || ''}`.trim()
  }

  async function fetchJoinedClasses() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('class_members')
      .select(`
        id,
        joined_at,
        classes (
          id,
          class_name,
          section,
          description,
          academic_year,
          semester,
          class_code,
          teacher_id
        )
      `)
      .eq('student_id', user.id)
      .order('joined_at', { ascending: false })

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    const formattedClasses = await Promise.all(
      (data || []).map(async (membership) => {
        const teacherName = await fetchTeacherName(
          membership.classes.teacher_id
        )

        const { data: memberCount } = await supabase.rpc(
          'get_class_member_count',
          {
            class_uuid: membership.classes.id,
          }
        )

        return {
          ...membership,
          teacherName,
          memberCount: memberCount || 0,
        }
      })
    )

    setClasses(formattedClasses)
    setLoading(false)
  }

  return (
    <DashboardLayout
      title="Collabify"
      pageTitle="My Classes"
      navigation={studentNavigation}
    >
      <JoinClassModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onJoined={fetchJoinedClasses}
      />

      <div className="space-y-6 text-gray-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="mt-2 bg-gradient-to-r from-cyan-500 to-green-800 bg-clip-text text-4xl font-black text-transparent">
              My Classes
            </h1>

            <p className="mt-2 max-w-3xl text-gray-500">
              View your joined classes and class projects.
            </p>
          </div>

          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="rounded-xl bg-gradient-to-r from-cyan-400 to-green-400 px-5 py-3 text-sm font-black text-black transition-all hover:opacity-90"
          >
            + Join Class
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading classes...</p>
        ) : classes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-400 bg-gray-50 p-8 text-center text-gray-500">
            You have not joined any classes yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {classes.map((membership) => {
              const item = membership.classes

              return (
                <Link
                  key={membership.id}
                  to={`/student/classes/${item.id}`}
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

                    <span className="rounded-full border border-[#00CFC8]/40 bg-white px-3 py-1 text-xs font-semibold text-[#00B8B0]">
                      {item.class_code}
                    </span>
                  </div>

                  <p className="mt-4 line-clamp-2 text-sm text-gray-600">
                    {item.description || 'No class description provided.'}
                  </p>

                  <div className="mt-5 grid grid-cols-1 gap-3 text-sm">
                    <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                      <p className="text-gray-500">Professor</p>
                      <p className="mt-1 font-bold text-gray-900">
                        {membership.teacherName || 'N/A'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                        <p className="text-gray-500">Students</p>
                        <p className="mt-1 font-bold text-gray-900">
                          {membership.memberCount}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-400 bg-[#EAF2FF] p-3">
                        <p className="text-gray-500">Semester</p>
                        <p className="mt-1 font-bold text-gray-900">
                          {item.semester}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-4">
                    <p className="text-xs text-gray-500">
                      Academic Year: {item.academic_year || 'N/A'}
                    </p>

                    <span className="text-sm font-semibold text-[#00B8B0]">
                      Open Class
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default StudentClassesPage