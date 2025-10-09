'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link' // Import Link for navigation

export default function StudentDashboard() {
  const router = useRouter()
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mealHistory, setMealHistory] = useState([])
  const [filteredHistory, setFilteredHistory] = useState([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [totalAmount, setTotalAmount] = useState(0)

  // State for modal
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedMealType, setSelectedMealType] = useState('')
  const [cancelDate, setCancelDate] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [cancelMessage, setCancelMessage] = useState({ type: '', text: '' })
  const [submitting, setSubmitting] = useState(false)

  const fetchStudentData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/')
        return
      }

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (error) throw error
      setStudent(data)
      
      if (data) {
        fetchMealHistory(data.roll_no)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [router])

  const fetchMealHistory = async (rollNo) => {
    try {
      const { data, error } = await supabase
        .from('meal_punches')
        .select('*')
        .eq('roll_no', rollNo)
        .order('meal_date', { ascending: false })
        .order('punch_time', { ascending: false })

      if (error) throw error
      setMealHistory(data || [])
      setFilteredHistory(data || [])
      calculateTotals(data || [])
    } catch (error) {
      console.error('Error fetching meal history:', error)
    }
  }

  const calculateTotals = (history) => {
    const total = history.reduce((sum, meal) => sum + (meal.amount || 0), 0)
    setTotalAmount(total)
  }

  const handleFilterChange = useCallback(() => {
    if (!fromDate && !toDate) {
      setFilteredHistory(mealHistory)
      calculateTotals(mealHistory)
      return
    }

    const filtered = mealHistory.filter(meal => {
      const mealDate = new Date(meal.meal_date)
      const from = fromDate ? new Date(fromDate) : null
      const to = toDate ? new Date(toDate) : null

      if (from && to) {
        return mealDate >= from && mealDate <= to
      } else if (from) {
        return mealDate >= from
      } else if (to) {
        return mealDate <= to
      }
      return true
    })

    setFilteredHistory(filtered)
    calculateTotals(filtered)
  }, [mealHistory, fromDate, toDate])

  const clearFilters = () => {
    setFromDate('')
    setToDate('')
    setFilteredHistory(mealHistory)
    calculateTotals(mealHistory)
  }

  useEffect(() => {
    fetchStudentData()
  }, [fetchStudentData])

  useEffect(() => {
    handleFilterChange()
  }, [fromDate, toDate, handleFilterChange])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
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

  const getTomorrowDate = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const handleCancelMealSubmit = async () => {
    if (!selectedMealType || !cancelDate) {
      setCancelMessage({ type: 'error', text: 'Please select meal type and date' })
      return
    }

    setSubmitting(true)
    setCancelMessage({ type: '', text: '' })

    try {
      const { error } = await supabase
        .from('meal_cancellations')
        .insert({
          student_id: student.id,
          roll_no: student.roll_no,
          meal_type: selectedMealType,
          cancellation_date: cancelDate,
          reason: cancelReason || null,
          requested_at: new Date().toISOString(),
          status: 'pending'
        })

      if (error) throw error

      setCancelMessage({ type: 'success', text: 'Meal cancellation request submitted successfully!' })
      
      setTimeout(() => {
        setShowCancelModal(false)
        setSelectedMealType('')
        setCancelDate('')
        setCancelReason('')
        setCancelMessage({ type: '', text: '' })
      }, 2000)
    } catch (error) {
      console.error('Error canceling meal:', error)
      setCancelMessage({ type: 'error', text: 'Failed to submit cancellation request. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelModalClose = () => {
    setShowCancelModal(false)
    setSelectedMealType('')
    setCancelDate('')
    setCancelReason('')
    setCancelMessage({ type: '', text: '' })
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
      {/* Cancel Meal Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 md:p-8 shadow-2xl border-4 border-white/30 max-w-md w-full relative">
            <button
              onClick={handleCancelModalClose}
              className="absolute top-4 right-4 w-10 h-10 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-xl transition-all"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Cancel Meal</h2>
            <div className="mb-6">
              <label className="text-white/90 text-sm font-semibold mb-3 block">Select Meal Type</label>
              <div className="grid grid-cols-2 gap-3">
                {['breakfast', 'lunch', 'snacks', 'dinner'].map((meal) => (
                  <button
                    key={meal}
                    onClick={() => setSelectedMealType(meal)}
                    className={`py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                      selectedMealType === meal
                        ? 'bg-green-500 text-white ring-4 ring-green-300'
                        : 'bg-white/30 text-white hover:bg-white/40'
                    }`}
                  >
                    {getMealIcon(meal)} {meal.charAt(0).toUpperCase() + meal.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-6">
              <label className="text-white/90 text-sm font-semibold mb-2 block">Select Date</label>
              <input
                type="date"
                value={cancelDate}
                onChange={(e) => setCancelDate(e.target.value)}
                min={getTomorrowDate()}
                className="w-full px-4 py-3 rounded-xl bg-white/20 border-2 border-white/30 text-white focus:outline-none focus:ring-4 focus:ring-blue-500 text-base"
              />
              <p className="text-white/60 text-xs mt-2">You can only cancel meals from tomorrow onwards</p>
            </div>
            <div className="mb-6">
              <label className="text-white/90 text-sm font-semibold mb-2 block">Reason (Optional)</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter reason for cancellation..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-white/20 border-2 border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-4 focus:ring-blue-500 text-sm resize-none"
              />
            </div>
            {cancelMessage.text && (
              <div className={`rounded-xl p-3 mb-4 text-sm ${
                cancelMessage.type === 'success' 
                  ? 'bg-green-500/30 border-2 border-green-400 text-green-100' 
                  : 'bg-red-500/30 border-2 border-red-400 text-red-100'
              }`}>
                {cancelMessage.text}
              </div>
            )}
            <button
              onClick={handleCancelMealSubmit}
              disabled={!selectedMealType || !cancelDate || submitting}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-all"
            >
              {submitting ? 'Submitting...' : '✓ Submit Cancellation'}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 md:p-8 shadow-2xl border border-white/20 mb-6">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Hi, {student?.name}! 👋
              </h1>
              <p className="text-blue-200">Welcome to your dashboard</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 md:px-6 py-2 rounded-lg font-semibold transition-all"
            >
              Logout
            </button>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 flex flex-col items-center">
              {student?.picture_url ? (
                <Image
                  src={student.picture_url}
                  alt="Profile"
                  width={192}
                  height={192}
                  className="w-48 h-48 rounded-full border-4 border-blue-500 object-cover mb-4"
                />
              ) : (
                <div className="w-48 h-48 rounded-full bg-blue-500 flex items-center justify-center text-white text-6xl mb-4">
                  {student?.name?.charAt(0)}
                </div>
              )}
              <div className={`px-4 py-2 rounded-full ${student?.active_meals ? 'bg-green-500' : 'bg-red-500'} text-white font-semibold`}>
                {student?.active_meals ? 'Active' : 'Inactive'}
              </div>
            </div>
            <div className="md:col-span-2 space-y-4">
              <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                <p className="text-blue-200 text-sm mb-1">Full Name</p>
                <p className="text-white text-xl font-semibold">{student?.name}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                <p className="text-blue-200 text-sm mb-1">Father&apos;s Name</p>
                <p className="text-white text-xl font-semibold">{student?.father_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                  <p className="text-blue-200 text-sm mb-1">Roll Number</p>
                  <p className="text-white text-xl font-semibold">{student?.roll_no}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                  <p className="text-blue-200 text-sm mb-1">Date of Birth</p>
                  <p className="text-white text-xl font-semibold">{student?.dob}</p>
                </div>
              </div>
              <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                <p className="text-blue-200 text-sm mb-1">Email</p>
                <p className="text-white text-xl font-semibold">{student?.email}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row justify-end gap-4">
          <Link href="/dashboard/feedback">
            <button
              className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg"
            >
              📝 Give Feedback
            </button>
          </Link>
          <button
            onClick={() => setShowCancelModal(true)}
            className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg"
          >
            🚫 Request Meal Cancellation
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-green-400/30 text-center">
            <p className="text-green-200 text-sm mb-2">Total Meals</p>
            <p className="text-white text-4xl font-bold">{filteredHistory.length}</p>
          </div>
           <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-purple-400/30 text-center">
            <p className="text-purple-200 text-sm mb-2">Total Amount</p>
            <p className="text-white text-4xl font-bold">₹{totalAmount.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 md:p-8 shadow-2xl border border-white/20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-2xl md:text-3xl font-bold text-white">📜 Meal History</h2>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <div className="flex flex-col">
                <label className="text-white/80 text-xs mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-white/80 text-xs mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              {(fromDate || toDate) && (
                <button
                  onClick={clearFilters}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all mt-auto"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            {filteredHistory.length === 0 ? (
              <div className="text-center text-white/50 py-12">
                <p className="text-xl mb-2">No meal records found</p>
                <p className="text-sm">Try adjusting your date filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map((meal) => (
                  <div
                    key={meal.id}
                    className="bg-white/10 rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="text-4xl">{getMealIcon(meal.meal_type)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-bold text-lg capitalize">
                              {meal.meal_type}
                            </span>
                            {meal.is_duplicate && (
                              <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                                Extra
                              </span>
                            )}
                          </div>
                          <div className="text-blue-200 text-sm">
                            {formatDate(meal.meal_date)} • {formatTime(meal.punch_time)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-green-300 font-bold text-xl">
                            ₹{meal.amount.toFixed(2)}
                          </div>
                          {meal.extra_amount > 0 && (
                            <div className="text-yellow-300 text-sm">
                              +₹{meal.extra_amount.toFixed(2)} extra
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {filteredHistory.length > 0 && (
            <div className="mt-6 pt-6 border-t border-white/20">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-blue-200 text-xs mb-1">Total Meals in Period</p>
                  <p className="text-white text-2xl font-bold">{filteredHistory.length}</p>
                </div>
                 <div>
                  <p className="text-purple-200 text-xs mb-1">Total Amount</p>
                  <p className="text-white text-2xl font-bold">₹{totalAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

