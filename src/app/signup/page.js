'use client'
import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()
  const [mealData, setMealData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [showSignup, setShowSignup] = useState(false)

  useEffect(() => {
    fetchMealStats()
  }, [])

  const fetchMealStats = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_meal_stats')
        .select('*')
        .gte('stat_date', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('stat_date', { ascending: true })

      if (error) throw error

      const transformedData = {}
      
      data?.forEach(item => {
        const dateKey = new Date(item.stat_date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        })
        
        if (!transformedData[dateKey]) {
          transformedData[dateKey] = {
            date: dateKey,
            breakfast: 0,
            lunch: 0,
            snacks: 0,
            dinner: 0
          }
        }
        
        transformedData[dateKey][item.meal_type] = item.meals_taken
      })

      setMealData(Object.values(transformedData))
      setLoading(false)
    } catch (error) {
      console.error('Error fetching meal stats:', error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <nav className="relative z-10 container mx-auto px-6 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🍽️</span>
            </div>
            <span className="text-2xl font-bold text-white">FutureMess</span>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={() => setShowLogin(true)}
              className="px-6 py-2 text-white font-semibold hover:text-blue-300 transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => setShowSignup(true)}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-7xl font-bold text-white mb-6">
            Welcome to <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Future Mess</span>
          </h1>
          <p className="text-2xl text-blue-200 mb-8 max-w-3xl mx-auto">
            Smart dining management for the modern campus. Track meals, manage nutrition, and experience hassle-free dining.
          </p>
          <div className="flex gap-6 justify-center">
            <button
              onClick={() => setShowSignup(true)}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-lg font-bold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-2xl hover:shadow-green-500/50 hover:scale-105"
            >
              Get Started 🚀
            </button>

          </div>
        </div>

        <div className="max-w-6xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-white text-center mb-12">
            📊 Last 2 Days Meal Statistics
          </h2>
          
          {loading ? (
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 border border-white/20 text-center">
              <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-white text-lg">Loading meal data...</p>
            </div>
          ) : mealData.length > 0 ? (
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={mealData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="breakfastGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    </linearGradient>
                    <linearGradient id="lunchGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.8}/>
                    </linearGradient>
                    <linearGradient id="snacksGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.8}/>
                    </linearGradient>
                    <linearGradient id="dinnerGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f472b6" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#ec4899" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#93c5fd" 
                    style={{ fontSize: '14px', fontWeight: 'bold' }}
                  />
                  <YAxis 
                    stroke="#93c5fd" 
                    style={{ fontSize: '14px', fontWeight: 'bold' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                      border: '1px solid rgba(59, 130, 246, 0.5)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontWeight: 'bold'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ 
                      paddingTop: '20px',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  />
                  <Bar dataKey="breakfast" fill="url(#breakfastGradient)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="lunch" fill="url(#lunchGradient)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="snacks" fill="url(#snacksGradient)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="dinner" fill="url(#dinnerGradient)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 border border-white/20 text-center">
              <span className="text-6xl mb-4 block">📊</span>
              <p className="text-white text-xl">No meal data available for the last 2 days</p>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all hover:scale-105 group">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">⚡</div>
            <h3 className="text-2xl font-bold text-white mb-3">Fast & Efficient</h3>
            <p className="text-blue-200">Quick meal scanning with real-time updates and instant verification</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all hover:scale-105 group">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📈</div>
            <h3 className="text-2xl font-bold text-white mb-3">Smart Analytics</h3>
            <p className="text-blue-200">Track meal consumption patterns and optimize food preparation</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all hover:scale-105 group">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🔒</div>
            <h3 className="text-2xl font-bold text-white mb-3">Secure & Reliable</h3>
            <p className="text-blue-200">Your data is protected with enterprise-grade security measures</p>
          </div>
        </div>
      </main>

      {showLogin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border border-white/30 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-white">Login</h2>
              <button 
                onClick={() => setShowLogin(false)}
                className="text-white/70 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>
            <LoginForm onClose={() => setShowLogin(false)} />
            <p className="text-center text-white/70 mt-4">
              Don't have an account?{' '}
              <button 
                onClick={() => { setShowLogin(false); setShowSignup(true); }}
                className="text-blue-300 hover:text-blue-200 font-semibold"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      )}

      {showSignup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-2xl w-full border border-white/30 shadow-2xl my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-white">Sign Up</h2>
              <button 
                onClick={() => setShowSignup(false)}
                className="text-white/70 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>
            <SignupForm onClose={() => setShowSignup(false)} />
            <p className="text-center text-white/70 mt-4">
              Already have an account?{' '}
              <button 
                onClick={() => { setShowSignup(false); setShowLogin(true); }}
                className="text-blue-300 hover:text-blue-200 font-semibold"
              >
                Login
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function LoginForm({ onClose }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      router.push('/dashboard')
      onClose()
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      
      <div>
        <label className="block text-white text-sm font-semibold mb-2">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="your@email.com"
        />
      </div>

      <div>
        <label className="block text-white text-sm font-semibold mb-2">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter password"
        />
      </div>

      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50"
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </div>
  )
}

function SignupForm({ onClose }) {
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(e.target.files[0])
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })

      if (authError) throw authError

      let photoUrl = ''

      if (photo) {
        const fileExt = photo.name.split('.').pop()
        const fileName = `${authData.user.id}_${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('student-photos')
          .upload(fileName, photo)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('student-photos')
          .getPublicUrl(fileName)

        photoUrl = urlData.publicUrl
      }

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

      router.push('/dashboard')
      onClose()
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-white text-sm font-semibold mb-2">Full Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Vikram Singh"
          />
        </div>

        <div>
          <label className="block text-white text-sm font-semibold mb-2">Father's Name *</label>
          <input
            type="text"
            name="fatherName"
            value={formData.fatherName}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Father's name"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-white text-sm font-semibold mb-2">Date of Birth *</label>
          <input
            type="date"
            name="dob"
            value={formData.dob}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-white text-sm font-semibold mb-2">Roll Number *</label>
          <input
            type="text"
            name="rollNo"
            value={formData.rollNo}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="2021001"
          />
        </div>
      </div>

      <div>
        <label className="block text-white text-sm font-semibold mb-2">Email *</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="your@email.com"
        />
      </div>

      <div>
        <label className="block text-white text-sm font-semibold mb-2">Password *</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Minimum 6 characters"
        />
      </div>

      <div>
        <label className="block text-white text-sm font-semibold mb-2">Profile Photo</label>
        <input
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-500 file:text-white hover:file:bg-blue-600"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50"
      >
        {loading ? 'Creating Account...' : 'Sign Up'}
      </button>
    </div>
  )
}