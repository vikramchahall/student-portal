// This file goes into `app/admin/scanner/page.js`
'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'

export default function ScannerPage() {
  const [rollNumber, setRollNumber] = useState('')
  const [dietRate, setDietRate] = useState('')
  const [savedDietRate, setSavedDietRate] = useState(0)
  const [mealsPrepared, setMealsPrepared] = useState('')
  const [savedMealsPrepared, setSavedMealsPrepared] = useState(0)
  const [currentMealType, setCurrentMealType] = useState('')
  const [currentStudent, setCurrentStudent] = useState(null)
  const [punchHistory, setPunchHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [showNumpad, setShowNumpad] = useState(false)
  const [numpadAmount, setNumpadAmount] = useState('')
  const [duplicateData, setDuplicateData] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    // Load saved diet rate from localStorage
    const saved = localStorage.getItem('dietRate')
    if (saved) {
      setSavedDietRate(parseFloat(saved))
      setDietRate(saved)
    }
    
    // Load today's meals prepared from Supabase
    loadTodaysMealsPrepared()
    
    // Fetch today's punch history
    fetchPunchHistory()
    
    // Auto-focus on input
    inputRef.current?.focus()

    // Keep input focused at all times (unless numpad is open)
    const focusInterval = setInterval(() => {
      if (document.activeElement !== inputRef.current && !showNumpad) {
        inputRef.current?.focus()
      }
    }, 100)

    return () => {
      clearInterval(focusInterval)
    }
  }, [showNumpad])

const fetchPunchHistory = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const currentMealType = getMealType() // Get the current meal type

      const { data, error } = await supabase
        .from('meal_punches')
        .select(`
          *,
          students (
            name,
            picture_url
          )
        `)
        .eq('meal_date', today)
        .eq('meal_type', currentMealType) // Filter by current meal type
        .order('punch_time', { ascending: false })

      if (error) throw error
      setPunchHistory(data || [])
    } catch (error) {
      console.error('Error fetching history:', error)
    }
}

  const loadTodaysMealsPrepared = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const currentMealType = getMealType()
      
      const { data, error } = await supabase
        .from('daily_meal_stats')
        .select('meals_prepared')
        .eq('stat_date', today)
        .eq('meal_type', currentMealType)
        .single()

      if (data) {
        setSavedMealsPrepared(data.meals_prepared || 0)
        setMealsPrepared((data.meals_prepared || 0).toString())
      }
    } catch (error) {
      console.error('Error loading meals prepared:', error)
    }
  }

// This file goes into app/admin/scanner/page.js

const saveMealsPrepared = async () => {
  if (!mealsPrepared || isNaN(mealsPrepared)) {
    setMessage({ type: 'error', text: 'Please enter a valid number' })
    return
  }

  try {
    const today = new Date().toISOString().split('T')[0]
    const preparedCount = parseInt(mealsPrepared)
    const currentMealType = getMealType()

    // Use upsert to either insert a new row or update an existing one
    const { error } = await supabase
      .from('daily_meal_stats')
      .upsert(
        {
          stat_date: today,
          meal_type: currentMealType,
          meals_prepared: preparedCount,
          // You might need to add a default value for meals_taken if the column doesn't have one
          // meals_taken: 0 
        },
        {
          // This tells Supabase to check for a conflict on these columns
          onConflict: 'stat_date, meal_type',
        }
      )

    if (error) throw error

    setSavedMealsPrepared(preparedCount)
    setMessage({
      type: 'success',
      text: `${currentMealType.toUpperCase()} meals prepared saved: ${preparedCount}`,
    })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  } catch (error) {
    console.error('Error saving meals prepared:', error)
    // Add the specific Supabase error message for better debugging
    setMessage({ type: 'error', text: `Failed to save: ${error.message}` })
  }
}
  const saveDietRate = () => {
    if (!dietRate || isNaN(dietRate)) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' })
      return
    }
    
    localStorage.setItem('dietRate', dietRate)
    setSavedDietRate(parseFloat(dietRate))
    setMessage({ type: 'success', text: `Diet rate saved: ₹${dietRate}` })
    
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  const getMealType = () => {
    const hour = new Date().getHours()
    
    if (hour >= 6 && hour < 10) return 'breakfast'
    if (hour >= 10 && hour < 16) return 'lunch'
    if (hour >= 16 && hour < 18) return 'snacks'
    if (hour >= 18 && hour < 23) return 'dinner'
    return 'breakfast' // Default
  }

  const handleRollNumberChange = (value) => {
    setRollNumber(value)
    
    // Auto-submit when 8 digits entered
    if (value.length === 8) {
      handlePunch(value)
    }
  }

  const handlePunch = async (roll) => {
  if (!savedDietRate || savedDietRate === 0) {
    setMessage({ type: 'error', text: 'Please set diet rate first!' })
    return
  }

  setLoading(true)
  setCurrentStudent(null)
  setMessage({ type: '', text: '' })

  try {
    const mealType = getMealType()
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()

    // 1. Check if ANY punch exists for this student, meal, and date.
    // This is a single, reliable query to determine if it's a first or duplicate punch.
    const { data: existingPunches } = await supabase
      .from('meal_punches')
      .select('id')
      .eq('roll_no', roll)
      .eq('meal_date', today)
      .eq('meal_type', mealType)
      .limit(1); // Optimize to fetch only one record if it exists

    const isDuplicate = existingPunches && existingPunches.length > 0;

    // Fetch student data
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('roll_no', roll)
      .single()

    if (studentError || !studentData) {
      setMessage({ type: 'error', text: `Student with roll ${roll} not found!` })
      setLoading(false)
      return
    }

    if (isDuplicate) {
      // If it's a duplicate, show the numpad and exit
      setDuplicateData({
        student: studentData,
        roll: roll,
        mealType: mealType,
        today: today,
        now: now
      })
      setShowNumpad(true)
    } else {
      // If it's a new punch, insert the record and update stats
      setCurrentStudent(studentData)

      const { error: punchError } = await supabase
        .from('meal_punches')
        .insert({
          student_id: studentData.id,
          roll_no: roll,
          meal_type: mealType,
          meal_date: today,
          punch_time: now,
          amount: savedDietRate,
          extra_amount: 0,
          is_duplicate: false
        })
      if (punchError) throw new Error(`Failed to save punch: ${punchError.message}`)

      const { data: statsData } = await supabase
        .from('daily_meal_stats')
        .select('*')
        .eq('stat_date', today)
        .eq('meal_type', mealType)
        .single()

      if (statsData) {
        await supabase
          .from('daily_meal_stats')
          .update({ meals_taken: statsData.meals_taken + 1 })
          .eq('stat_date', today)
          .eq('meal_type', mealType)
      } else {
        await supabase
          .from('daily_meal_stats')
          .insert({ 
            stat_date: today, 
            meal_type: mealType,
            meals_taken: 1, 
            meals_prepared: 0 
          })
      }

      setMessage({ 
        type: 'success', 
        text: `✅ ${studentData.name} - ${mealType.toUpperCase()} - ₹${savedDietRate}` 
      })
      setRollNumber('')
      setTimeout(() => {
        setMessage({ type: '', text: '' })
        setCurrentStudent(null)
      }, 3000)
    }

    await fetchPunchHistory() // Refresh history in all cases

  } catch (error) {
    console.error('Error:', error)
    setMessage({ type: 'error', text: 'Error processing punch!' })
    setRollNumber('')
  } finally {
    setLoading(false)
    setRollNumber('')

  }
}

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTotalPunches = () => punchHistory.length

 const getCurrentMealTypePunches = () => {
  const currentMealType = getMealType()
  return punchHistory.filter(punch => 
    punch.meal_type === currentMealType && !punch.is_duplicate
  ).length
}

  const getSurplus = () => savedMealsPrepared - getCurrentMealTypePunches()

  const handleNumpadClick = (value) => {
    if (value === 'backspace') {
      setNumpadAmount(prev => prev.slice(0, -1))
    } else if (value === 'clear') {
      setNumpadAmount('')
    } else {
      setNumpadAmount(prev => prev + value)
    }
  }

const handleNumpadSubmit = async () => {
  if (!numpadAmount || isNaN(numpadAmount) || parseFloat(numpadAmount) <= 0) {
    setMessage({ type: 'error', text: 'Please enter a valid amount!' })
    return
  }

  const customAmount = parseFloat(numpadAmount)
  setLoading(true)

  try {
    // Insert meal punch with custom amount
    const { error: punchError } = await supabase
      .from('meal_punches')
      .insert({
        student_id: duplicateData.student.id,
        roll_no: duplicateData.roll,
        meal_type: duplicateData.mealType,
        meal_date: duplicateData.today,
        punch_time: duplicateData.now,
        amount: customAmount,
        extra_amount: customAmount,
        is_duplicate: true
      })

    if (punchError) throw punchError

    // ❌ REMOVED: The code block that updates meals_taken is removed.
    // This is the key change to fix the counting issue.

    // Refresh history
    await fetchPunchHistory()

    setMessage({ 
      type: 'success', 
      text: `✅ ${duplicateData.student.name} - ${duplicateData.mealType.toUpperCase()} - ₹${customAmount} (Extra)` 
    })

    // Close numpad and reset
    setShowNumpad(false)
    setNumpadAmount('')
    setDuplicateData(null)

    setTimeout(() => {
      setMessage({ type: '', text: '' })
      inputRef.current?.focus()
    }, 3000)

  } catch (error) {
    console.error('Error:', error)
    setMessage({ type: 'error', text: 'Error processing duplicate punch!' })
  } finally {
    setLoading(false)
  }
}
  const handleNumpadCancel = () => {
    setShowNumpad(false)
    setNumpadAmount('')
    setDuplicateData(null)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 p-8">
      {/* Numpad Popup */}
      {showNumpad && duplicateData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 shadow-2xl border-4 border-white/30 max-w-md w-full mx-4 relative">
            {/* Close Button */}
            <button
              onClick={handleNumpadCancel}
              className="absolute top-4 right-4 w-10 h-10 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-xl transition-all"
            >
              ✕
            </button>

            {/* Student Info */}
            <div className="text-center mb-6">
              <div className="text-yellow-300 text-lg font-bold mb-2">⚠️ DUPLICATE PUNCH</div>
              <div className="flex items-center justify-center gap-4 mb-4">
                {duplicateData.student.picture_url ? (
                  <Image
                    src={duplicateData.student.picture_url}
                    alt={duplicateData.student.name}
                    width={60}
                    height={60}
                    className="w-16 h-16 rounded-full border-4 border-yellow-400 object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-yellow-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-yellow-400">
                    {duplicateData.student.name?.charAt(0)}
                  </div>
                )}
                <div className="text-left">
                  <div className="text-white font-bold text-xl">{duplicateData.student.name}</div>
                  <div className="text-blue-200 text-sm">{duplicateData.student.roll_no}</div>
                </div>
              </div>
              <div className="text-white/80 text-sm">
                Already punched for <span className="font-bold text-yellow-300">{duplicateData.mealType.toUpperCase()}</span>
              </div>
              <div className="text-white/80 text-sm mt-1">
                Enter custom amount for extra meal
              </div>
            </div>

            {/* Amount Display */}
            <div className="bg-white/20 rounded-xl p-4 mb-6 border-2 border-white/40">
              <div className="text-white/60 text-sm mb-1">Amount (₹)</div>
              <div className="text-white text-4xl font-bold text-center font-mono">
                {numpadAmount || '0'}
              </div>
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'].map((btn) => (
                <button
                  key={btn}
                  onClick={() => handleNumpadClick(btn)}
                  className={`py-4 rounded-xl font-bold text-xl transition-all ${
                    btn === 'clear' || btn === 'backspace'
                      ? 'bg-red-500 hover:bg-red-600 text-white text-base'
                      : 'bg-white/30 hover:bg-white/40 text-white'
                  }`}
                >
                  {btn === 'backspace' ? '⌫' : btn === 'clear' ? 'CLR' : btn}
                </button>
              ))}
            </div>

            {/* Submit Button */}
            <button
              onClick={handleNumpadSubmit}
              disabled={!numpadAmount || loading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-xl transition-all"
            >
              {loading ? 'Processing...' : '✓ Confirm Punch'}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                📱 Meal Scanner
              </h1>
              <p className="text-blue-200">Real-time meal punching system</p>
            </div>
            
            <div className="text-right">
              {/* Back to Dashboard Button */}
              <Link href="/admin" passHref>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-all mb-4">
                  Back 
                </button>
              </Link>
              
              {/* Current Meal Type Badge */}
              <div className="mb-3 inline-block bg-purple-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                {getMealType().toUpperCase()}
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-2">
                <div>
                  <div className="text-2xl font-bold text-green-400">{getCurrentMealTypePunches()}</div>
                  <div className="text-blue-200 text-xs">Punches ({getMealType()})</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-400">{savedMealsPrepared}</div>
                  <div className="text-blue-200 text-xs">Meals Prepared</div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-white/20">
                <div className={`text-2xl font-bold ${getSurplus() >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {getSurplus()}
                </div>
                <div className="text-blue-200 text-xs">Surplus</div>
              </div>
              <div className="mt-3 pt-2 border-t border-white/20">
                <div className="text-lg font-semibold text-blue-300">{getTotalPunches()}</div>
                <div className="text-blue-200 text-xs">Total Punches Today</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Scanner Input */}
          <div className="lg:col-span-2 space-y-6">
            {/* Configuration Section */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">⚙️ Configuration</h2>
              
              {/* Diet Rate */}
              <div className="mb-4">
                <label className="text-white/80 text-sm mb-2 block">Diet Rate per Meal</label>
                <div className="flex gap-4">
                  <input
                    type="number"
                    value={dietRate}
                    onChange={(e) => setDietRate(e.target.value)}
                    placeholder="Enter diet rate (₹)"
                    className="flex-1 px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-500 text-lg"
                  />
                  <button
                    onClick={saveDietRate}
                    className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-bold text-lg transition-all"
                  >
                    Save
                  </button>
                </div>
                {savedDietRate > 0 && (
                  <div className="mt-2 text-green-300 text-sm font-semibold">
                    ✅ Current Rate: ₹{savedDietRate} per meal
                  </div>
                )}
              </div>

              {/* Meals Prepared */}
              <div>
                <label className="text-white/80 text-sm mb-2 block">
                  Meals Prepared - {getMealType().toUpperCase()}
                </label>
                <div className="flex gap-4">
                  <input
                    type="number"
                    value={mealsPrepared}
                    onChange={(e) => setMealsPrepared(e.target.value)}
                    placeholder="Enter meals prepared"
                    className="flex-1 px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                  />
                  <button
                    onClick={saveMealsPrepared}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-bold text-lg transition-all"
                  >
                    Save
                  </button>
                </div>
                {savedMealsPrepared > 0 && (
                  <div className="mt-2 text-blue-300 text-sm font-semibold">
                    ✅ {getMealType().toUpperCase()} Prepared: {savedMealsPrepared}
                  </div>
                )}
              </div>
            </div>

            {/* Scanner Input */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">🔍 Scan Student ID</h2>
              <input
                ref={inputRef}
                type="text"
                value={rollNumber}
                onChange={(e) => handleRollNumberChange(e.target.value)}
                placeholder="Enter 8-digit Roll Number"
                maxLength={8}
                className="w-full px-6 py-4 rounded-lg bg-white/20 border-2 border-blue-400 text-white placeholder-white/50 focus:outline-none focus:ring-4 focus:ring-blue-500 text-2xl font-mono text-center tracking-widest"
                disabled={loading}
                autoFocus
              />
              <div className="mt-3 text-blue-200 text-sm text-center">
                {rollNumber.length}/8 digits • Auto-submit when complete
              </div>
            </div>

            {/* Message Display */}
            {message.text && (
              <div className={`rounded-xl p-4 ${
                message.type === 'success' ? 'bg-green-500/20 border border-green-500 text-green-200' :
                message.type === 'error' ? 'bg-red-500/20 border border-red-500 text-red-200' :
                'bg-yellow-500/20 border border-yellow-500 text-yellow-200'
              }`}>
                {message.text}
              </div>
            )}

            {/* Current Student Display */}
            {currentStudent && (
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border-2 border-green-400">
                <h2 className="text-xl font-bold text-white mb-4">✅ Punched Successfully</h2>
                <div className="flex items-center gap-6">
                  {currentStudent.picture_url ? (
                    <Image
                      src={currentStudent.picture_url}
                      alt={currentStudent.name}
                      width={100}
                      height={100}
                      className="w-24 h-24 rounded-full border-4 border-green-400 object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center text-white text-4xl font-bold border-4 border-green-400">
                      {currentStudent.name?.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-white mb-1">{currentStudent.name}</div>
                    <div className="text-green-200 mb-1">Roll: {currentStudent.roll_no}</div>
                    <div className="text-green-200 mb-1">Father: {currentStudent.father_name}</div>
                    <div className="flex gap-4 mt-3">
                      <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                        {getMealType().toUpperCase()}
                      </span>
                      <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                        ₹{savedDietRate}
                      </span>
                      <span className="bg-purple-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                        {formatTime(new Date())}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Punch History */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 sticky top-8">
              <h2 className="text-xl font-bold text-white mb-4">📜 Today's History</h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                {punchHistory.length === 0 ? (
                  <div className="text-center text-white/50 py-8">
                    No punches yet today
                  </div>
                ) : (
                  punchHistory.map((punch) => (
                    <div key={punch.id} className="bg-white/10 rounded-lg p-3 border border-white/20 hover:bg-white/20 transition-all">
                      <div className="flex items-center gap-3">
                        {punch.students?.picture_url ? (
                          <Image
                            src={punch.students.picture_url}
                            alt={punch.students?.name || 'Student'}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full border-2 border-blue-400 object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                            {punch.students?.name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-semibold text-sm truncate">
                            {punch.students?.name || 'Unknown'}
                          </div>
                          <div className="text-blue-200 text-xs">
                            {punch.roll_no} • {punch.meal_type}
                            {punch.is_duplicate && <span className="text-yellow-300"> (Extra)</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-300 font-bold text-sm">₹{punch.amount}</div>
                          <div className="text-white/50 text-xs">{formatTime(punch.punch_time)}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.8);
        }
      `}</style>
    </div>
  )
}