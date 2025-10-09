'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function FeedbackPage() {
  const router = useRouter()
  const [student, setStudent] = useState(null)
  const [menuData, setMenuData] = useState({})
  const [loading, setLoading] = useState(true)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [dislikedItems, setDislikedItems] = useState('')
  const [alternativeSuggestions, setAlternativeSuggestions] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const mealTypes = ['breakfast', 'lunch', 'snacks', 'dinner']

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
    } catch (error) {
      console.error('Error:', error)
    }
  }, [router])

  const fetchMenuData = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('weekly_menu')
        .select('*')

      if (error) throw error

      const menuObj = {}
      data?.forEach(item => {
        const key = `${item.day_of_week}-${item.meal_type}`
        menuObj[key] = item.menu_items || 'No menu available'
      })

      setMenuData(menuObj)
    } catch (error) {
      console.error('Error fetching menu:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudentData()
    fetchMenuData()
  }, [fetchStudentData])

  const handleDishClick = (day, mealType, menuItems) => {
    if (!menuItems || menuItems === 'No menu available') return
    
    setSelectedItem({
      day,
      mealType,
      menuItems
    })
    setRating(0)
    setDislikedItems('')
    setAlternativeSuggestions('')
    setMessage({ type: '', text: '' })
    setShowFeedbackModal(true)
  }

  const handleSubmitFeedback = async () => {
    if (rating === 0) {
      setMessage({ type: 'error', text: 'Please select a rating!' })
      return
    }

    setSubmitting(true)
    setMessage({ type: '', text: '' })

    try {
      const feedbackData = {
        student_id: student.id,
        roll_no: student.roll_no,
        student_name: student.name,
        day_of_week: selectedItem.day,
        // --- THIS IS THE FIX ---
        // Changed selectedItem.meal_type to selectedItem.mealType
        meal_type: selectedItem.mealType, 
        // -----------------------
        menu_items: selectedItem.menuItems,
        rating: rating,
        disliked_items: dislikedItems.trim() || null,
        alternative_suggestions: alternativeSuggestions.trim() || null,
        submitted_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('meal_feedback')
        .insert(feedbackData)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      setMessage({ type: 'success', text: '✅ Feedback submitted successfully!' })
      
      setTimeout(() => {
        setShowFeedbackModal(false)
        setSelectedItem(null)
        setRating(0)
        setDislikedItems('')
        setAlternativeSuggestions('')
        setMessage({ type: '', text: '' })
      }, 2000)
    } catch (error) {
      console.error('Error submitting feedback:', error)
      setMessage({ 
        type: 'error', 
        text: `❌ Failed to submit feedback. Please try again.` 
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleModalClose = () => {
    setShowFeedbackModal(false)
    setSelectedItem(null)
    setRating(0)
    setDislikedItems('')
    setAlternativeSuggestions('')
    setMessage({ type: '', text: '' })
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
      breakfast: 'bg-yellow-500/10 border-yellow-400/30 hover:bg-yellow-500/20',
      lunch: 'bg-green-500/10 border-green-400/30 hover:bg-green-500/20',
      snacks: 'bg-purple-500/10 border-purple-400/30 hover:bg-purple-500/20',
      dinner: 'bg-blue-500/10 border-blue-400/30 hover:bg-blue-500/20'
    }
    return colors[mealType] || 'bg-gray-500/10 border-gray-400/30 hover:bg-gray-500/20'
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading || !student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 p-4 md:p-8">
      {/* Feedback Modal */}
      {showFeedbackModal && selectedItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 md:p-8 shadow-2xl border-4 border-white/30 max-w-2xl w-full relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={handleModalClose}
              className="absolute top-4 right-4 w-10 h-10 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-xl transition-all z-10"
            >
              ✕
            </button>

            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 text-center pr-8">
              Rate Your Meal
            </h2>

            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-6 border border-white/30">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{getMealIcon(selectedItem.mealType)}</span>
                <div>
                  <p className="text-white font-bold text-lg capitalize">{selectedItem.mealType}</p>
                  <p className="text-blue-200 text-sm">{selectedItem.day}</p>
                </div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 mt-3">
                <p className="text-white/70 text-xs font-semibold mb-1">Menu:</p>
                <p className="text-white text-sm whitespace-pre-line">{selectedItem.menuItems}</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-white/90 text-sm font-semibold mb-3 block text-center">
                How would you rate this meal?
              </label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="text-5xl md:text-6xl transition-all transform hover:scale-110 focus:outline-none"
                  >
                    {star <= (hoveredRating || rating) ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-center text-white mt-2 font-semibold">
                  {rating === 1 && "😞 Poor"}
                  {rating === 2 && "😐 Below Average"}
                  {rating === 3 && "🙂 Average"}
                  {rating === 4 && "😊 Good"}
                  {rating === 5 && "😍 Excellent"}
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="text-white/90 text-sm font-semibold mb-2 block">
                What didn't you like? (Optional)
              </label>
              <textarea
                value={dislikedItems}
                onChange={(e) => setDislikedItems(e.target.value)}
                placeholder="E.g., Too spicy, Not fresh, Bland taste..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-white/20 border-2 border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-4 focus:ring-blue-500 text-sm resize-none"
              />
            </div>

            <div className="mb-6">
              <label className="text-white/90 text-sm font-semibold mb-2 block">
                Suggest alternatives (Optional)
              </label>
              <textarea
                value={alternativeSuggestions}
                onChange={(e) => setAlternativeSuggestions(e.target.value)}
                placeholder="E.g., More vegetables, Different spices, Include fruits..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-white/20 border-2 border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-4 focus:ring-blue-500 text-sm resize-none"
              />
            </div>

            {message.text && (
              <div className={`rounded-xl p-3 mb-4 text-sm ${
                message.type === 'success' 
                  ? 'bg-green-500/30 border-2 border-green-400 text-green-100' 
                  : 'bg-red-500/30 border-2 border-red-400 text-red-100'
              }`}>
                {message.text}
              </div>
            )}

            <button
              onClick={handleSubmitFeedback}
              disabled={rating === 0 || submitting}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-all"
            >
              {submitting ? 'Submitting...' : '✓ Submit Feedback'}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                💬 Weekly Menu Feedback
              </h1>
              <p className="text-blue-200">Hi {student?.name}, rate your meals and help us improve!</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-all"
              >
                ← Back to Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-semibold transition-all"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="bg-blue-500/20 border border-blue-400 rounded-lg p-4">
            <p className="text-white text-sm">
              💡 <strong>Tip:</strong> Click on any meal to rate it and provide feedback. Your feedback helps improve the mess menu!
            </p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 md:p-6 shadow-2xl border border-white/20 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-4 border border-white/20 rounded-tl-xl font-bold text-lg">
                  Day / Meal
                </th>
                {mealTypes.map((mealType) => (
                  <th
                    key={mealType}
                    className={`${getMealColor(mealType)} text-white p-4 border border-white/20 font-bold text-lg min-w-[200px]`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl">{getMealIcon(mealType)}</span>
                      <span className="capitalize">{mealType}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day} className="hover:bg-white/5 transition-colors">
                  <td className="sticky left-0 z-10 bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4 border border-white/20 font-bold text-lg">
                    {day}
                  </td>
                  {mealTypes.map((mealType) => {
                    const key = `${day}-${mealType}`
                    const menuItems = menuData[key] || 'No menu available'
                    const hasMenu = menuItems !== 'No menu available'
                    
                    return (
                      <td
                        key={mealType}
                        className={`${getMealColor(mealType)} border border-white/20 p-3 ${
                          hasMenu ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                        } transition-all`}
                        onClick={() => hasMenu && handleDishClick(day, mealType, menuItems)}
                      >
                        <div className="min-h-[100px] flex flex-col justify-between">
                          <p className="text-white text-sm whitespace-pre-line mb-2">
                            {menuItems}
                          </p>
                          {hasMenu && (
                            <div className="text-center">
                              <span className="inline-block bg-white/30 hover:bg-white/40 text-white px-3 py-1 rounded-full text-xs font-semibold transition-all">
                                ⭐ Rate This
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-green-400/30 mt-6">
          <h2 className="text-xl font-bold text-white mb-3">ℹ️ How to Provide Feedback</h2>
          <ul className="text-white space-y-2">
            <li>• Click on any meal cell to open the feedback form</li>
            <li>• Rate the meal from 1 to 5 stars (1 = Poor, 5 = Excellent)</li>
            <li>• Share what you didn't like about the meal (optional)</li>
            <li>• Suggest alternative dishes you'd prefer (optional)</li>
            <li>• Your feedback is anonymous and helps improve meal quality</li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        .overflow-x-auto::-webkit-scrollbar {
          height: 8px;
        }
        .overflow-x-auto::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.5);
          border-radius: 10px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.8);
        }
      `}</style>
    </div>
  )
}

