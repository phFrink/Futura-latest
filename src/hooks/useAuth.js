import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export function useAuth(requiredRoles = []) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.push('/login')
          return
        }

        const userData = session.user
        const userRole = userData?.user_metadata?.role?.toLowerCase()

        setUser(userData)
        setRole(userRole)

        // Check if user has required role
        if (requiredRoles.length > 0) {
          const normalizedRoles = requiredRoles.map(r => r.toLowerCase())
          setHasAccess(normalizedRoles.includes(userRole))
        } else {
          setHasAccess(true)
        }

        setLoading(false)
      } catch (error) {
        console.error('Auth error:', error)
        setLoading(false)
        router.push('/login')
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setRole(null)
        setHasAccess(false)
        router.push('/login')
      } else if (session) {
        const userData = session.user
        const userRole = userData?.user_metadata?.role?.toLowerCase()
        setUser(userData)
        setRole(userRole)

        if (requiredRoles.length > 0) {
          const normalizedRoles = requiredRoles.map(r => r.toLowerCase())
          setHasAccess(normalizedRoles.includes(userRole))
        } else {
          setHasAccess(true)
        }
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [requiredRoles, router, supabase])

  const signOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('user')
    router.push('/login')
  }

  return {
    user,
    role,
    loading,
    hasAccess,
    signOut,
    isAdmin: role === 'admin',
    isManager: role === 'customer service',
    isSales: role === 'sales representative',
    isHomeOwner: role === 'home owner',
  }
}
