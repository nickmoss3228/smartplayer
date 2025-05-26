import { BrowserRouter as Router, Routes, Route } from 'react-router'
import Player from './pages/Player'
import Homepage from './pages/Homepage';
import { Provider } from "react-redux";
import { store } from "./store/store";
import Levels from './pages/Levels';
import Easy from './pages/Easy';
import Medium from './pages/Medium';
import Hard from './pages/Hard';
import './App.css'

function App() {

  return (
    <>
      <Provider store={store}>
       <Router>
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/levels" element={<Levels/>} />
            <Route path="/player" element={<Player />} />
            <Route path="/levels/easy" element={<Easy />} />
            <Route path="/levels/medium" element={<Medium />} />
            <Route path="/levels/hard" element={<Hard/>}/>
          </Routes>
        </Router> 
      </Provider>
    </>
  )
}

export default App
