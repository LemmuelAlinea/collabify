import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabaseClient'

function AuthCallbackPage() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('Finishing Google sign in...')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    handleCallback()
  }, [])

  async function handleCallback() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      setMessage('Google sign in failed.')
      return
    }

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (!existingProfile) {
      const fullName = user.user_metadata?.full_name || ''
      const nameParts = fullName.split(' ')

      const firstName =
        user.user_metadata?.given_name || nameParts[0] || 'Google'

      const lastName =
        user.user_metadata?.family_name ||
        nameParts.slice(1).join(' ') ||
        'User'

      const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        email: user.email,
        role: 'student',
        is_onboarded: false,
        avatar_url: user.user_metadata?.avatar_url || null,
      })

      if (profileError) {
        setMessage(profileError.message)
        return
      }

      navigate('/student/onboarding')
      return
    }

    if (existingProfile.role === 'student' && !existingProfile.is_onboarded) {
      navigate('/student/onboarding')
    } else if (existingProfile.role === 'student') {
      navigate('/student/dashboard')
    } else if (existingProfile.role === 'teacher') {
      navigate('/teacher/dashboard')
    } else if (existingProfile.role === 'project_manager') {
      navigate('/general/manager/dashboard')
    } else if (existingProfile.role === 'project_sponsor') {
      navigate('/general/sponsor/dashboard')
    } else if (existingProfile.role === 'project_member') {
      navigate('/general/member/dashboard')
    } else if (existingProfile.role === 'platform_admin') {
      navigate('/admin/dashboard')
    } else {
      navigate('/login')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#001E6C] text-white">
      <p>{message}</p>
    </div>
  )
}

export default AuthCallbackPage