'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'

export default function MealsCancelledPage() {
  const [cancellations, setCancellations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, breakfast, lunch, snacks, dinner
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchCancellations()
    // Auto cleanup every minute
    const interval = setInterval(() => {
      cleanupPastCancellations()
    }, 60000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchCancellations = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('meal_cancellations')
        .select(`
          *,
          students (
            name,
            roll_no,
            father_name,
            picture_url,
            email
          )
        `)
        .eq('status', 'pending')
        .order('cancellation_date', { ascending: true })
        .order('requested_at', { ascending: false })

      if (error) throw error
      
      // Auto cleanup past cancellations
      await cleanupPastCancellations()
      
      setCancellations(data || [])
    } catch (error) {
      console.error('Error fetching cancellations:', error)
    } finally {
      setLoading(false)
    }
  }

  const cleanupPastCancellations = async () => {
    try {
      const now = new Date()
      const currentDate = now.toISOString().split('T')[0]
      const currentHour = now.getHours()

      // Determine which meals have passed
      let mealTypesToDelete = []
      
      if (currentHour >= 10) mealTypesToDelete.push('breakfast')
      if (currentHour >= 16) mealTypesToDelete.push('lunch')
      if (currentHour >= 18) mealTypesToDelete.push('snacks')
      if (currentHour >= 23) mealTypesToDelete.push('dinner')

      // Delete cancellations for meals that have passed today
      if (mealTypesToDelete.length > 0) {
        await supabase
          .from('meal_cancellations')
          .delete()
          .eq('cancellation_date', currentDate)
          .in('meal_type', mealTypesToDelete)
      }

      // Delete all cancellations for dates before today
      await supabase
        .from('meal_cancellations')
        .delete()
        .lt('cancellation_date', currentDate)

    } catch (error) {
      console.error('Error cleaning up cancellations:', error)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this cancellation request?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('meal_cancellations')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      // Refresh the list
      fetchCancellations()
    } catch (error) {
      console.error('Error deleting cancellation:', error)
      alert('Failed to delete cancellation')
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getMealIcon = (mealType) => {
    const icons = {
      breakfast: '🌅',
      lunch: '🍽️',
      snacks: '☕',
      dinner: '🌙'
    }
    return icons[mealType] || '🍴'
  }

  const getMealColor = (mealType) => {
    const colors = {
      breakfast: 'from-yellow-500/20 to-orange-500/20 border-yellow-400/30',
      lunch: 'from-green-500/20 to-emerald-500/20 border-green-400/30',
      snacks: 'from-purple-500/20 to-pink-500/20 border-purple-400/30',
      dinner: 'from-blue-500/20 to-indigo-500/20 border-blue-400/30'
    }
    return colors[mealType] || 'from-gray-500/20 to-gray-600/20 border-gray-400/30'
  }

  const getFilteredCancellations = () => {
    let filtered = cancellations

    // Filter by meal type
    if (filter !== 'all') {
      filtered = filtered.filter(c => c.meal_type === filter)
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(c => 
        c.students?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.students?.roll_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.students?.father_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return filtered
  }

  const filteredCancellations = getFilteredCancellations()

  const getMealTypeCount = (mealType) => {
    if (mealType === 'all') return cancellations.length
    return cancellations.filter(c => c.meal_type === mealType).length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                🚫 Cancelled Meals
              </h1>
              <p className="text-blue-200">Manage student meal cancellations</p>
            </div>
            <Link href="/admin">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-all">
                ← Back to Dashboard
              </button>
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className={`rounded-xl p-4 cursor-pointer transition-all ${
              filter === 'all' 
                ? 'bg-white/30 ring-4 ring-white/50' 
                : 'bg-white/10 hover:bg-white/20'
            }`}
            onClick={() => setFilter('all')}>
              <div className="text-2xl md:text-3xl font-bold text-white">{getMealTypeCount('all')}</div>
              <div className="text-blue-200 text-xs md:text-sm">Total Cancellations</div>
            </div>

            <div className={`rounded-xl p-4 cursor-pointer transition-all ${
              filter === 'breakfast' 
                ? 'bg-yellow-500/30 ring-4 ring-yellow-400/50' 
                : 'bg-yellow-500/10 hover:bg-yellow-500/20'
            }`}
            onClick={() => setFilter('breakfast')}>
              <div className="text-2xl md:text-3xl font-bold text-white">{getMealTypeCount('breakfast')}</div>
              <div className="text-yellow-200 text-xs md:text-sm">🌅 Breakfast</div>
            </div>

            <div className={`rounded-xl p-4 cursor-pointer transition-all ${
              filter === 'lunch' 
                ? 'bg-green-500/30 ring-4 ring-green-400/50' 
                : 'bg-green-500/10 hover:bg-green-500/20'
            }`}
            onClick={() => setFilter('lunch')}>
              <div className="text-2xl md:text-3xl font-bold text-white">{getMealTypeCount('lunch')}</div>
              <div className="text-green-200 text-xs md:text-sm">🍽️ Lunch</div>
            </div>

            <div className={`rounded-xl p-4 cursor-pointer transition-all ${
              filter === 'snacks' 
                ? 'bg-purple-500/30 ring-4 ring-purple-400/50' 
                : 'bg-purple-500/10 hover:bg-purple-500/20'
            }`}
            onClick={() => setFilter('snacks')}>
              <div className="text-2xl md:text-3xl font-bold text-white">{getMealTypeCount('snacks')}</div>
              <div className="text-purple-200 text-xs md:text-sm">☕ Snacks</div>
            </div>

            <div className={`rounded-xl p-4 cursor-pointer transition-all ${
              filter === 'dinner' 
                ? 'bg-blue-500/30 ring-4 ring-blue-400/50' 
                : 'bg-blue-500/10 hover:bg-blue-500/20'
            }`}
            onClick={() => setFilter('dinner')}>
              <div className="text-2xl md:text-3xl font-bold text-white">{getMealTypeCount('dinner')}</div>
              <div className="text-blue-200 text-xs md:text-sm">🌙 Dinner</div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 shadow-2xl border border-white/20 mb-6">
          <input
            type="text"
            placeholder="Search by name, roll number, or father's name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Cancellations List */}
        <div className="space-y-4">
          {filteredCancellations.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 shadow-2xl border border-white/20 text-center">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-white text-xl font-semibold mb-2">No cancellations found</p>
              <p className="text-blue-200">
                {filter !== 'all' 
                  ? `No cancellations for ${filter}` 
                  : 'All students are having their meals!'}
              </p>
            </div>
          ) : (
            filteredCancellations.map((cancellation) => (
              <div
                key={cancellation.id}
                className={`bg-gradient-to-br ${getMealColor(cancellation.meal_type)} backdrop-blur-lg rounded-2xl p-6 shadow-2xl border transition-all hover:scale-[1.02]`}
              >
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Student Photo */}
                  <div className="flex-shrink-0">
                    {cancellation.students?.picture_url ? (
                      <Image
                        src={cancellation.students.picture_url}
                        alt={cancellation.students?.name || 'Student'}
                        width={100}
                        height={100}
                        className="w-24 h-24 rounded-full border-4 border-white/30 object-cover"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center text-white text-3xl font-bold">
                        {cancellation.students?.name?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>

                  {/* Student Details */}
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-1">
                          {cancellation.students?.name || 'Unknown Student'}
                        </h3>
                        <p className="text-white/80 mb-1">
                          <span className="font-semibold">Roll No:</span> {cancellation.students?.roll_no}
                        </p>
                        <p className="text-white/80 mb-1">
                          <span className="font-semibold">Father:</span> {cancellation.students?.father_name}
                        </p>
                        <p className="text-white/80">
                          <span className="font-semibold">Email:</span> {cancellation.students?.email}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-center border border-white/30">
                          <div className="text-3xl mb-1">{getMealIcon(cancellation.meal_type)}</div>
                          <div className="text-white font-bold capitalize">{cancellation.meal_type}</div>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-center border border-white/30">
                          <div className="text-white font-bold">{formatDate(cancellation.cancellation_date)}</div>
                          <div className="text-white/70 text-xs">Cancel Date</div>
                        </div>
                      </div>
                    </div>

                    {/* Reason */}
                    {cancellation.reason && (
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 mb-4 border border-white/30">
                        <p className="text-white/70 text-xs mb-1 font-semibold">Reason:</p>
                        <p className="text-white text-sm">{cancellation.reason}</p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div className="text-white/60 text-xs">
                        Requested at: {formatTime(cancellation.requested_at)} on {formatDate(cancellation.requested_at)}
                      </div>
                      <button
                        onClick={() => handleDelete(cancellation.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}