import "tailwindcss";
import { Link } from 'react-router'

const Homepage = () => {
  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-6 font-[montserrat] transition ">
      <div className="max-w-md w-full flex flex-col items-center ">
      <h1 className="text-4xl text-black text-center font-bold mb-6 text-[90px] antialiased tracking-[20px] ">
            Haila 
          </h1>
        <div className='bg-white p-8 text-black rounded-xl shadow-lg w-full mb-8 font-[montserrat]'>

          <p className="text-center mb-6 text-xl font-[montserrat]">
            This is the perfect place to challenge yourself with exciting stories to listen to.
          </p>
        </div>
        
        <Link to={'/levels'} className="inline-block">
          <button className="bg-green-200 hover:bg-green-300 text-black font-bold py-4 px-12 rounded-lg text-xl shadow-md transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 cursor-pointer">
            Start the Experience
          </button>
        </Link>
      </div>
    </div>
  )
}

export default Homepage