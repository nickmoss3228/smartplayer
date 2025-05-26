import { Link } from 'react-router'

const Levels = () => {
  return (
    <div className='min-h-screen flex items-center justify-center bg-[#F5F7FA] py-12 font-[montserrat]'>
      <div className='text-black bg-white rounded-xl shadow-lg flex flex-col items-center justify-center w-[1300px] max-w-[90%] p-8 my-8'>
        <h1 className="text-3xl font-bold text-blue-700 mb-8">Welcome to the Listening Challenge!</h1>
        
        <p className="text-lg text-gray-700 mb-12 max-w-xl text-center font-[montserrat]">
          Choose your difficulty level below. Each level offers a different listening experience with varying complexity of audio content.
        </p>
        
        <div className="text-xl font-semibold mb-6 text-gray-800">Choose a level of listening:</div>
        
        <div className="flex flex-row gap-6 justify-center text-center ">
          <Link to={'/levels/easy'} className="inline-block ">
            <div className="w-100 h-100 text-center px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-bold shadow-md">
              Easy
            </div>
          </Link>

          <Link to={'/levels/medium'} className="inline-block ">
            <div className="w-100 h-100 px-8 py-4 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-bold shadow-md">
              Medium
            </div>
          </Link>

          <Link to={'/levels/hard'} className="inline-block">
            <div className="w-100 h-100 px-8 py-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-bold shadow-md">
              Hard
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Levels