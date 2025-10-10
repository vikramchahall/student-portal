'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

export default function AdminDashboard() {
  const router = useRouter()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [adminEmail, setAdminEmail] = useState('')

  const fetchStudents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setStudents(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const checkAdmin = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/')
        return
      }

      const { data: adminData, error } = await supabase
        .from('admin_users')
        .select('email')
        .eq('email', session.user.email)
        .single()

      if (error || !adminData) {
        alert('Access denied! Admin only.')
        router.push('/')
        return
      }

      setAdminEmail(session.user.email)
      fetchStudents()
    } catch (error) {
      console.error('Error:', error)
      router.push('/')
    }
  }, [router, fetchStudents])

  useEffect(() => {
    checkAdmin()
  }, [checkAdmin])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                🛡️ Admin Dashboard
              </h1>
              <p className="text-blue-200">Logged in as: {adminEmail}</p>
            </div>
            
            {/* --- MODIFIED BUTTON SECTION --- */}
            <div className="flex space-x-2 md:space-x-4">
              <Link href="/admin/scanner" passHref>
                <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
                  Scanner
                </button>
              </Link>
              <Link href="/admin/billing" passHref>
                <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
                  Billing
                </button>
              </Link>
              <Link href="/admin/feedback" passHref>
                <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
                  Feedback
                </button>
              </Link>
              <Link href="/admin/mealscancelled" passHref>
                <button className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
                  Cancelled
                </button>
              </Link>
              <Link href="/admin/menu" passHref>
                <button className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
                  Menu
                </button>
              </Link>
              <Link href="/admin/surplus" passHref>
                <button className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
                  Surplus
                </button>
              </Link>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 mb-6">
            <p className="text-white text-lg font-semibold">
              📊 Total Students: {students.length}
            </p>
          </div>

          <div className="bg-white/5 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">All Students</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-4 text-white font-semibold">Photo</th>
                    <th className="text-left py-3 px-4 text-white font-semibold">Name</th>
                    <th className="text-left py-3 px-4 text-white font-semibold">Father&apos;s Name</th>
                    <th className="text-left py-3 px-4 text-white font-semibold">Roll No</th>
                    <th className="text-left py-3 px-4 text-white font-semibold">DOB</th>
                    <th className="text-left py-3 px-4 text-white font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="py-3 px-4">
                        {student.picture_url ? (
                          <Image
                            src={student.picture_url}
                            alt={student.name}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-full object-cover border-2 border-blue-500"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                            {student.name?.charAt(0)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-white">{student.name}</td>
                      <td className="py-3 px-4 text-blue-200">{student.father_name}</td>
                      <td className="py-3 px-4 text-green-300 font-semibold">{student.roll_no}</td>
                      <td className="py-3 px-4 text-blue-200">{student.dob}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${student.active_meals ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                          {student.active_meals ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}