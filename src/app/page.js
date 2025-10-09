'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()
  const [surplusData, setSurplusData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [showSignup, setShowSignup] = useState(false)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [selectedMeal, setSelectedMeal] = useState(null)

  const [impactStats, setImpactStats] = useState({
    totalMealsSaved: 0,
    totalBookings: 0
  })

  // --- THIS useEffect IS NOW UPDATED FOR REALTIME ---
  useEffect(() => {
    // Fetch initial data on component load
    fetchSurplusData()
    fetchImpactStats()

    // Set up a realtime subscription
    const channel = supabase
      .channel('surplus_bookings_changes')
      .on(
        'postgres_changes',
        { 
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public', 
          table: 'surplus_bookings' 
        },
        (payload) => {
          // When a change occurs, re-fetch the impact stats
          console.log('Change received!', payload)
          fetchImpactStats()
        }
      )
      .subscribe()

    // Cleanup function to remove the subscription when the component unmounts
    return () => {
      supabase.removeChannel(channel)
    }
  }, []) // Empty dependency array ensures this runs only once on mount

  const fetchSurplusData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const { data: dailyStats, error } = await supabase
        .from('daily_meal_stats')
        .select('meal_type, meals_prepared, meals_taken')
        .eq('stat_date', today);

      if (error) throw error;

      if (!dailyStats || dailyStats.length === 0) {
        setSurplusData([]);
        setLoading(false);
        return;
      }
      
      const surplus = dailyStats.map(stat => ({
        type: stat.meal_type,
        prepared: stat.meals_prepared || 0,
        taken: stat.meals_taken || 0,
        surplus: (stat.meals_prepared || 0) - (stat.meals_taken || 0)
      }));

      const availableSurplus = surplus
        .filter(m => m.surplus > 0)
        .slice(-3);

      setSurplusData(availableSurplus);

    } catch (error) {
      console.error('Error fetching surplus data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchImpactStats = async () => {
    try {
      const { data, error } = await supabase
        .from('surplus_bookings')
        .select('quantity_needed')
        .eq('status', 'accepted')

      if (error) throw error
      
      const totalMeals = data?.reduce((sum, booking) => sum + (booking.quantity_needed || 0), 0) || 0
      const totalAccepted = data?.length || 0

      setImpactStats({
        totalMealsSaved: totalMeals,
        totalBookings: totalAccepted
      })
    } catch (error) {
      console.error('Error fetching impact stats:', error)
    }
  }

  const handleBookClick = (meal) => {
    setSelectedMeal(meal)
    setShowBookingForm(true)
  }

  const getMealIcon = (type) => {
    const icons = {
      breakfast: '🌅',
      lunch: '🍱',
      snacks: '🍪',
      dinner: '🌙'
    }
    return icons[type] || '🍽️'
  }

  const getMealColor = (type) => {
    const colors = {
      breakfast: 'from-amber-400 to-orange-500',
      lunch: 'from-green-400 to-emerald-500',
      snacks: 'from-purple-400 to-indigo-500',
      dinner: 'from-pink-400 to-rose-500'
    }
    return colors[type] || 'from-blue-400 to-blue-600'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950 relative overflow-hidden">
      {/* ... The rest of your JSX remains exactly the same ... */}
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
 
         {/* Surplus Meals Section */}
         <div className="max-w-6xl mx-auto mb-16">
           <h2 className="text-4xl font-bold text-white text-center mb-12">
             🍲 Available Surplus Meals Today
           </h2>
           
           {loading ? (
             <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 border border-white/20 text-center">
               <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
               <p className="text-white text-lg">Loading surplus data...</p>
             </div>
           ) : surplusData.length > 0 ? (
             <div className="grid md:grid-cols-3 gap-6">
               {surplusData.map((meal, index) => (
                 <div 
                   key={index}
                   className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all hover:scale-105"
                 >
                   <div className="text-center mb-4">
                     <div className="text-5xl mb-3">{getMealIcon(meal.type)}</div>
                     <h3 className="text-2xl font-bold text-white capitalize mb-2">
                       {meal.type}
                     </h3>
                   </div>
                   
                   <div className="space-y-2 mb-6">
                     <div className="flex justify-between text-white/80">
                       <span>Prepared:</span>
                       <span className="font-semibold">{meal.prepared}</span>
                     </div>
                     <div className="flex justify-between text-white/80">
                       <span>Taken:</span>
                       <span className="font-semibold">{meal.taken}</span>
                     </div>
                     <div className="h-px bg-white/20 my-2"></div>
                     <div className="flex justify-between text-white">
                       <span className="font-bold">Surplus:</span>
                       <span className={`font-bold text-xl bg-gradient-to-r ${getMealColor(meal.type)} bg-clip-text text-transparent`}>
                         {meal.surplus}
                       </span>
                     </div>
                   </div>
                   
                   <button
                     onClick={() => handleBookClick(meal)}
                     className={`w-full bg-gradient-to-r ${getMealColor(meal.type)} text-white font-bold py-3 rounded-lg hover:scale-105 transition-all shadow-lg`}
                   >
                     Book Now
                   </button>
                 </div>
               ))}
             </div>
           ) : (
             <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 border border-white/20 text-center">
               <span className="text-6xl mb-4 block">🍽️</span>
               <p className="text-white text-xl">No surplus meals available at the moment</p>
               <p className="text-white/60 text-sm mt-2">Check back later for available meals</p>
             </div>
           )}
         </div>
 
         {/* --- Impact Banner Section --- */}
         <div className="max-w-6xl mx-auto mb-16 bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-xl rounded-3xl p-8 border border-green-500/30 shadow-2xl">
           <div className="flex items-center gap-4 mb-4">
             <span className="text-6xl">🎉</span>
             <div>
               <h2 className="text-3xl font-bold text-white mb-1">
                 Making a Difference!
               </h2>
               <p className="text-green-200">
                 Together, we're fighting food waste and feeding those in need
               </p>
             </div>
           </div>
           
           <div className="grid md:grid-cols-2 gap-6 mt-6">
             <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-white/70 text-sm mb-1">Meals Donated</p>
                   <p className="text-5xl font-bold text-white">
                     {impactStats.totalMealsSaved}
                   </p>
                 </div>
                 <span className="text-6xl">🍽️</span>
               </div>
               <p className="text-green-300 text-sm mt-3 font-semibold">
                 ✨ Lives touched with warm meals
               </p>
             </div>
 
             <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-white/70 text-sm mb-1">Successful Donations</p>
                   <p className="text-5xl font-bold text-white">
                     {impactStats.totalBookings}
                   </p>
                 </div>
                 <span className="text-6xl">💚</span>
               </div>
               <p className="text-green-300 text-sm mt-3 font-semibold">
                 🌟 Acts of kindness completed
               </p>
             </div>
           </div>
         </div>
        {/* Contact Information */}
        <div className="max-w-4xl mx-auto mb-16 bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <h3 className="text-3xl font-bold text-white text-center mb-6">📞 Contact Us</h3>
          <div className="grid md:grid-cols-2 gap-6 text-white">
            <div className="text-center">
              <p className="text-blue-200 mb-2">Email</p>
              <p className="font-semibold">futuremess@campus.edu</p>
            </div>
            <div className="text-center">
              <p className="text-blue-200 mb-2">Phone</p>
              <p className="font-semibold">+91 98765 43210</p>
            </div>
          </div>
        </div>

        {/* Features Section */}
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

      {/* Login & Signup Modals etc... */}
      {showLogin && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border border-white/30 shadow-2xl">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-3xl font-bold text-white">Login</h2>
               <button onClick={() => setShowLogin(false)} className="text-white/70 hover:text-white text-2xl">✕</button>
             </div>
             <LoginForm onClose={() => setShowLogin(false)} />
             <p className="text-center text-white/70 mt-4">
               Don't have an account?{' '}
               <button onClick={() => { setShowLogin(false); setShowSignup(true); }} className="text-blue-300 hover:text-blue-200 font-semibold">
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
               <button onClick={() => setShowSignup(false)} className="text-white/70 hover:text-white text-2xl">✕</button>
             </div>
             <SignupForm onClose={() => setShowSignup(false)} />
             <p className="text-center text-white/70 mt-4">
               Already have an account?{' '}
               <button onClick={() => { setShowSignup(false); setShowLogin(true); }} className="text-blue-300 hover:text-blue-200 font-semibold">
                 Login
               </button>
             </p>
           </div>
         </div>
       )}
 
       {showBookingForm && selectedMeal && (
         <BookingForm 
           meal={selectedMeal}
           onClose={() => {
             setShowBookingForm(false)
             setSelectedMeal(null)
           }}
         />
       )}
    </div>
  )
}

// --- ALL OTHER COMPONENTS (LoginForm, SignupForm, BookingForm) REMAIN THE SAME ---
// ... (Paste the rest of your components here)

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

      const { data: adminData } = await supabase
        .from('admin_users')
        .select('email')
        .eq('email', email)
        .single()

      if (adminData) {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }

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

function BookingForm({ meal, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    organizationName: '',
    phoneNumber: '',
    quantity: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    // Validation
    if (!formData.name || !formData.organizationName || !formData.phoneNumber || !formData.quantity) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    if (parseInt(formData.quantity) > meal.surplus) {
      setError(`Quantity cannot exceed available surplus (${meal.surplus})`)
      setLoading(false)
      return
    }

    if (parseInt(formData.quantity) <= 0) {
      setError('Quantity must be greater than 0')
      setLoading(false)
      return
    }

    try {
      const { error: insertError } = await supabase
        .from('surplus_bookings')
        .insert({
          booking_date: new Date().toISOString().split('T')[0],
          meal_type: meal.type,
          requester_name: formData.name,
          organization_name: formData.organizationName,
          phone_number: formData.phoneNumber,
          quantity_needed: parseInt(formData.quantity),
          status: 'pending'
        })

      if (insertError) throw insertError

      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getMealIcon = (type) => {
    const icons = {
      breakfast: '🌅',
      lunch: '🍱',
      snacks: '🍪',
      dinner: '🌙'
    }
    return icons[type] || '🍽️'
  }

  const getMealColor = (type) => {
    const colors = {
      breakfast: 'from-amber-400 to-orange-500',
      lunch: 'from-green-400 to-emerald-500',
      snacks: 'from-purple-400 to-indigo-500',
      dinner: 'from-pink-400 to-rose-500'
    }
    return colors[type] || 'from-blue-400 to-blue-600'
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border border-white/30 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{getMealIcon(meal.type)}</span>
            <div>
              <h2 className="text-3xl font-bold text-white capitalize">{meal.type}</h2>
              <p className="text-white/70 text-sm">Available: {meal.surplus} meals</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-2xl font-bold text-white mb-2">Booking Submitted!</h3>
            <p className="text-white/70">We'll contact you soon with confirmation</p>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-white text-sm font-semibold mb-2">Your Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-semibold mb-2">Organization Name *</label>
              <input
                type="text"
                name="organizationName"
                value={formData.organizationName}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="NGO / Organization"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-semibold mb-2">Phone Number *</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-semibold mb-2">
                Quantity Needed * (Max: {meal.surplus})
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="1"
                max={meal.surplus}
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter quantity"
              />
            </div>

            <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-2">📞 Our Contact Details:</h4>
              <div className="text-white/90 text-sm space-y-1">
                <p><strong>Email:</strong> futuremess@campus.edu</p>
                <p><strong>Phone:</strong> +91 98765 43210</p>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`w-full bg-gradient-to-r ${getMealColor(meal.type)} text-white font-bold py-3 rounded-lg hover:scale-105 transition-all disabled:opacity-50 shadow-lg`}
            >
              {loading ? 'Submitting...' : 'Submit Booking Request'}
            </button>

            <p className="text-white/60 text-xs text-center">
              * All bookings are subject to admin approval. We'll contact you within 24 hours.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}