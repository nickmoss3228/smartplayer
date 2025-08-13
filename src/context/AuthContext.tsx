import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext()

const API_BASE_URL = 'http://localhost:5000/api'

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      checkTokenValidity(token)
    } else {
      setLoading(false)
    }
  }, [])

const checkTokenValidity = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/validate-token`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    setUser(response.data.user)
  } catch (error) {
    console.error('Token validation failed:', error)
    localStorage.removeItem('token')
  } finally {
    setLoading(false)
  }
}

  const signIn = async (username, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        username,
        password
      })
      
      const { token, user } = response.data
      localStorage.setItem('token', token)
      setUser(user)
      
      return { user, error: null }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed'
      return { user: null, error: { message: errorMessage } }
    }
  }

  const signUp = async (username, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/signup`, {
        username,
        password
      })
      
      const { token, user } = response.data
      localStorage.setItem('token', token)
      setUser(user)
      
      return { user, error: null }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed'
      return { user: null, error: { message: errorMessage } }
    }
  }

  const signOut = async () => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        await axios.post(`${API_BASE_URL}/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('token')
      setUser(null)
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}