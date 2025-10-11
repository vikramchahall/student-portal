'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SignUpPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    fatherName: '',
    dob: '',
    rollNo: '',
  })
  const [photo, setPhoto] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    
    // Restrict roll number to 8 digits only
    if (name === 'rollNo') {
      // Only allow digits and max 8 characters
      const numericValue = value.replace(/\D/g, '').slice(0, 8)
      setFormData({
        ...formData,
        [name]: numericValue
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }

  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('Photo size must be less than 5MB')
        return
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file')
        return
      }
      
      setPhoto(file)
      setError('') // Clear any previous errors
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // ===== VALIDATE EVERYTHING FIRST - BEFORE ANY API CALLS =====
    
    // Validate all required fields
    if (!formData.name.trim()) {
      setError('Full name is required')
      return
    }

    if (!formData.fatherName.trim()) {
      setError("Father's name is required")
      return
    }

    if (!formData.dob) {
      setError('Date of birth is required')
      return
    }

    if (!formData.rollNo.trim()) {
      setError('Roll number is required')
      return
    }

    // Validate roll number (must be exactly 8 digits)
    if (!/^\d{8}$/.test(formData.rollNo)) {
      setError('Roll number must be exactly 8 digits')
      return
    }

    if (!formData.email.trim()) {
      setError('Email is required')
      return
    }

    if (!formData.password || formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    // Validate photo
    if (!photo) {
      setError('Profile photo is required')
      return
    }

    // ===== ALL VALIDATION PASSED - NOW START API CALLS =====
    setLoading(true)

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })

      if (authError) throw authError

      let photoUrl = ''

      // 2. Upload photo
      const fileExt = photo.name.split('.').pop()
      const fileName = `${authData.user.id}_${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('student-photos')
        .upload(fileName, photo)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('student-photos')
        .getPublicUrl(fileName)

      photoUrl = urlData.publicUrl

      // 3. Insert student data
      const { error: insertError } = await supabase
        .from('students')
        .insert({
          user_id: authData.user.id,
          email: formData.email,
          name: formData.name,
          father_name: formData.fatherName,
          dob: formData.dob,
          roll_no: formData.rollNo,
          picture_url: photoUrl,
          active_meals: true
        })

      if (insertError) throw insertError

      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          <h1 className="text-4xl font-bold text-white text-center mb-2">
            📝 Student Registration
          </h1>
          <p className="text-blue-200 text-center mb-8">Create your account</p>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 border border-green-500 text-green-200 px-4 py-3 rounded-lg mb-4">
              ✅ Registration successful! Redirecting to dashboard...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white text-sm font-semibold mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Vikram Singh"
                  required
                />
              </div>

              <div>
                <label className="block text-white text-sm font-semibold mb-2">
                  Father's Name *
                </label>
                <input
                  type="text"
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="vicky papa"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white text-sm font-semibold mb-2">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-white text-sm font-semibold mb-2">
                  Roll Number * (8 digits)
                </label>
                <input
                  type="text"
                  name="rollNo"
                  value={formData.rollNo}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="12345678"
                  required
                  inputMode="numeric"
                />
                <p className="text-white/50 text-xs mt-1">Enter 8-digit roll number</p>
              </div>
            </div>

            <div>
              <label className="block text-white text-sm font-semibold mb-2">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-white text-sm font-semibold mb-2">
                Password *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Minimum 6 characters"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-white text-sm font-semibold mb-2">
                Profile Photo *
              </label>
              <div className={`relative ${!photo ? 'ring-2 ring-red-500/50 rounded-lg' : ''}`}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                />
              </div>
              <p className="text-white/50 text-xs mt-1">
                <span className="text-red-300">* Required</span> - JPG, PNG (Max 5MB)
                {photo && <span className="text-green-300 ml-2">✓ Photo selected: {photo.name}</span>}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-white/70 mb-2">Already have an account?</p>
            <button
              onClick={() => router.push('/')}
              className="text-blue-300 hover:text-blue-200 font-semibold"
            >
              Login Here
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}