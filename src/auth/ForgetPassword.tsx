// import { useState } from 'react'
// import { Link } from 'react-router-dom'
// import { useAuth } from '../context/AuthContext'

// const ForgotPassword = () => {
//   const [email, setEmail] = useState('')
//   const [error, setError] = useState('')
//   const [message, setMessage] = useState('')
//   const [isLoading, setIsLoading] = useState(false)
  
//   const { resetPassword } = useAuth()

//   const handleSubmit = async (e) => {
//     e.preventDefault()
    
//     setIsLoading(true)
//     setError('')
//     setMessage('')
    
//     try {
//       await resetPassword(email)
//       setMessage('Check your email for password reset instructions')
//     } catch (error) {
//       setError(error.message)
//     } finally {
//       setIsLoading(false)
//     }
//   }

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
//       <div className="max-w-md w-full space-y-8">
//         <div>
//           <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
//             Reset your password
//           </h2>
//           <p className="mt-2 text-center text-sm text-gray-400">
//             Enter your email address and we'll send you a reset link
//           </p>
//         </div>
        
//         <div className="bg-gray-800 rounded-lg shadow-xl p-8">
//           {message && (
//             <div className="mb-4 p-4 bg-green-900 border border-green-700 rounded-md">
//               <p className="text-green-200 text-sm">{message}</p>
//             </div>
//           )}
          
//           {error && (
//             <div className="mb-4 p-4 bg-red-900 border border-red-700 rounded-md">
//               <p className="text-red-200 text-sm">{error}</p>
//             </div>
//           )}

//           <form className="space-y-6" onSubmit={handleSubmit}>
//             <div>
//               <label htmlFor="email" className="block text-sm font-medium text-gray-300">
//                 Email Address
//               </label>
//               <input
//                 id="email"
//                 name="email"
//                 type="email"
//                 autoComplete="email"
//                 required
//                 className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
//                 placeholder="Enter your email address"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//               />
//             </div>

//             <div>
//               <button
//                 type="submit"
//                 disabled={isLoading}
//                 className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 {isLoading ? 'Sending...' : 'Send Reset Link'}
//               </button>
//             </div>
//           </form>

//           <div className="mt-6 text-center">
//             <Link 
//               to="/login" 
//               className="text-blue-400 hover:text-blue-300 font-medium text-sm"
//             >
//               Back to Login
//             </Link>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }

// export default ForgotPassword