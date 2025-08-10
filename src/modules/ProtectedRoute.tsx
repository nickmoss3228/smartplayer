// import { Navigate, useLocation } from 'react-router-dom'
// import { useAuth } from '../contexts/AuthContext'
// import LoadingSpinner from './LoadingSpinner' // Create this component

// const ProtectedRoute = ({ children, requireAuth = true }) => {
//   const { user, loading } = useAuth()
//   const location = useLocation()

//   if (loading) {
//     return <LoadingSpinner />
//   }

//   if (requireAuth && !user) {
//     // Redirect to login page with return url
//     return <Navigate to="/login" state={{ from: location }} replace />
//   }

//   if (!requireAuth && user) {
//     // Redirect authenticated users away from auth pages
//     return <Navigate to="/dashboard" replace />
//   }

//   return children
// }

// export default ProtectedRoute