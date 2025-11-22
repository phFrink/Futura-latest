'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Home, Upload, X, User } from 'lucide-react'
import { toast } from 'react-toastify'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [profilePhoto, setProfilePhoto] = useState(null)
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
      if (typeof window !== 'undefined') {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
          router.push('/dashboard');
        }
      }
  },[router])

  // Handle profile photo selection
  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a valid image file (JPEG, PNG, GIF, or WebP)')
        return
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        toast.error('File size must be less than 5MB')
        return
      }

      setProfilePhoto(file)

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setProfilePhotoPreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // Upload profile photo
  const uploadProfilePhoto = async () => {
    if (!profilePhoto) return null

    console.log('🚀 Starting photo upload...')
    console.log('File details:', {
      name: profilePhoto.name,
      size: profilePhoto.size,
      type: profilePhoto.type
    })

    setUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('profile', profilePhoto)

      console.log('📤 Sending request to /api/upload...')

      let response
      try {
        response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })
        console.log('📥 Response received:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        })
      } catch (fetchError) {
        console.error('💥 Fetch request failed:', fetchError)
        throw new Error('Network request failed: ' + fetchError.message)
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      console.log('Content-Type:', contentType)

      let result
      try {
        if (contentType && contentType.includes('application/json')) {
          result = await response.json()
          console.log('📄 JSON Response:', JSON.stringify(result, null, 2))
        } else {
          const text = await response.text()
          console.log('📄 Text Response:', text)
          result = { error: 'Non-JSON response: ' + text }
        }
      } catch (parseError) {
        console.error('💥 Failed to parse response:', parseError)
        result = { error: 'Failed to parse response: ' + parseError.message }
      }

      if (!response.ok) {
        console.error('❌ Upload API error:', JSON.stringify(result, null, 2))
        console.error('❌ Response status:', response.status, response.statusText)
        console.error('❌ Full response headers:', Object.fromEntries(response.headers.entries()))

        const errorMessage = result?.error || result?.details || result?.message || `HTTP ${response.status}: ${response.statusText}`
        console.error('❌ Error message to show:', errorMessage)

        throw new Error(errorMessage)
      }

      console.log('✅ Upload successful:', result)
      return result.url
    } catch (error) {
      console.error('💥 Photo upload error:', error)
      toast.error('Failed to upload profile photo: ' + error.message)
      return null
    } finally {
      setUploadingPhoto(false)
    }
  }

  // Remove photo
  const removePhoto = () => {
    setProfilePhoto(null)
    setProfilePhotoPreview(null)
    // Reset file input
    const fileInput = document.getElementById('profilePhoto')
    if (fileInput) {
      fileInput.value = ''
    }
  }


  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Basic validation
    if (!username.trim()) {
      setError('Username is required')
      setLoading(false)
      return
    }

    if (!email.trim()) {
      setError('Email is required')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      // Upload profile photo first if selected
      let profilePhotoUrl = null
      if (profilePhoto) {
        profilePhotoUrl = await uploadProfilePhoto()
        if (!profilePhotoUrl) {
          // Photo upload failed, but continue with signup
          console.warn('Profile photo upload failed, continuing without photo')
        }
      }

      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: username,
            full_name: username,
            role: 'admin',
            profile_photo: profilePhotoUrl,
          }
        }
      });

      if (authError) {
        setError(authError.message)
        return
      }

      // Success - Supabase auth handles everything
      if (authData.user) {
        console.log('Auth user created:', authData.user.id);
        console.log('User metadata:', authData.user.user_metadata);

        // Success - redirect to login
        toast.success('Account created successfully! Please check your email for verification.')
        router.push('/login')
      }

    } catch (err) {
      console.error('Signup error:', err);
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }



  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden bg-gradient-to-br from-gray-900 to-gray-800 p-4 relative">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-full"></div>
          </div>
          <span className="text-white font-semibold text-lg">Futura Homes</span>
        </div>
      </div>

         <div className="relative hidden lg:flex lg:flex-1 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 bg-[url('https://res.cloudinary.com/dzqr64ynb/image/upload/v1757853197/367682534_728117842057400_2673269750727514222_n_rdhagt.jpg')] bg-cover bg-center bg-no-repeat" />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-[rgba(0,0,0,0.2)]" />

        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-20 h-20 border border-white/20 rounded-full"></div>
          <div className="absolute top-32 right-20 w-12 h-12 border border-white/20 rounded-full"></div>
          <div className="absolute bottom-20 left-20 w-16 h-16 border border-white/20 rounded-full"></div>
          <div className="absolute top-20 right-40 w-8 h-8 bg-white/10 rounded-full"></div>
        </div>

        {/* Logo */}
        <div className="absolute top-8 left-8 flex items-center space-x-2 z-10">
          <div className="w-8 h-8 flex items-center justify-center">
            <div className="bg-gradient-to-br from-red-400 to-red-500 px-1 py-1 rounded-md">
              <Home className="w-7 h-7 text-white" />
            </div>
          </div>
          <span className="text-white font-semibold text-lg">Futura Homes</span>
        </div>

        {/* Optional Main Content */}
        {/* <div className="flex flex-col justify-center h-full px-6 xl:px-12 max-w-lg xl:max-w-xl 2xl:max-w-2xl mx-auto z-10">
          ...your main content here...
        </div> */}
      </div>


    

      {/* Right Side - Login Form */}
      <div className="flex-1 bg-white flex items-center justify-center p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-80px)] lg:min-h-screen">
        <div className="w-full max-w-sm sm:max-w-md">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">
              Welcome to Futura Homes
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">Please enter your correct email address to verify</p>
          </div>
          <form onSubmit={handleSignup} className="space-y-4 sm:space-y-6">
         <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 sm:py-3 border border-gray-200 rounded-lg focus:outline-none  transition-all text-sm sm:text-base"
                required
              />
            </div>

            {/* Profile Photo Upload */}
            <div>
              <label htmlFor="profilePhoto" className="block text-sm font-medium text-gray-700 mb-1">
                Profile Photo (Optional)
              </label>

              {!profilePhotoPreview ? (
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="profilePhoto" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-3 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> your profile photo
                      </p>
                      <p className="text-xs text-gray-400">PNG, JPG, GIF or WebP (MAX. 5MB)</p>
                    </div>
                    <input
                      id="profilePhoto"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handlePhotoChange}
                    />
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <div className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="relative">
                      <img
                        src={profilePhotoPreview}
                        alt="Profile preview"
                        className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-lg"
                      />
                      {uploadingPhoto && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {profilePhoto?.name || 'Profile Photo'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {profilePhoto ? `${(profilePhoto.size / 1024 / 1024).toFixed(2)} MB` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={removePhoto}
                      disabled={uploadingPhoto}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 sm:py-3 border border-gray-200 rounded-lg focus:outline-none  transition-all text-sm sm:text-base"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 sm:py-3 border border-gray-200 rounded-lg focus:outline-none  transition-all text-sm sm:text-base"
                placeholder="••••••••••"
                required
              />
            </div>

        

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || uploadingPhoto}
              className="w-full bg-gradient-to-br from-red-400 to-red-500 text-white py-2.5 sm:py-3 px-4 rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {uploadingPhoto ? 'Uploading Photo...' : (loading ? 'Creating Account...' : 'Sign Up')}
            </button>

      

       

            <div className="text-center pt-2">
              <span className="text-xs sm:text-sm text-gray-600">
                Do you have an account?{' '}
                <button
                onClick={() => router.push('/login')}
                  type="button"
                  className="text-purple-600 hover:text-purple-700 font-medium cursor-pointer"
                >
                  Sign in
                </button>
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}