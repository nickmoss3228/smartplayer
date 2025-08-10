// import React, { createContext, useContext, useReducer, useEffect } from 'react';

// const ProgressContext = createContext();

// const initialState = {
//   easy: {
//     completedLevels: [1, 2, 3],
//     currentLevel: 4,
//     totalLevels: 10
//   },
//   medium: {
//     completedLevels: [1],
//     currentLevel: 2,
//     totalLevels: 15
//   },
//   hard: {
//     completedLevels: [],
//     currentLevel: 1,
//     totalLevels: 20
//   },
//   totalExperience: 350,
//   achievements: [
//     { id: 1, name: 'First Steps', description: 'Complete your first level', earned: true },
//     { id: 2, name: 'Getting Started', description: 'Complete 3 levels', earned: true },
//     { id: 3, name: 'Dedicated', description: 'Complete 5 levels', earned: false },
//   ]
// };

// const progressReducer = (state, action) => {
//   switch (action.type) {
//     case 'COMPLETE_LEVEL':
//       const { difficulty, level } = action.payload;
//       const updatedDifficulty = {
//         ...state[difficulty],
//         completedLevels: [...state[difficulty].completedLevels, level].sort((a, b) => a - b),
//         currentLevel: Math.max(state[difficulty].currentLevel, level + 1)
//       };
      
//       // Calculate experience based on difficulty
//       const expGain = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 20 : 30;
      
//       return {
//         ...state,
//         [difficulty]: updatedDifficulty,
//         totalExperience: state.totalExperience + expGain
//       };
      
//     case 'RESET_PROGRESS':
//       return initialState;
      
//     case 'LOAD_PROGRESS':
//       return action.payload;
      
//     default:
//       return state;
//   }
// };

// export const ProgressProvider = ({ children }) => {
//   const [state, dispatch] = useReducer(progressReducer, initialState);

//   // Load progress from localStorage on mount
//   useEffect(() => {
//     const savedProgress = localStorage.getItem('audioPlayerProgress');
//     if (savedProgress) {
//       dispatch({ type: 'LOAD_PROGRESS', payload: JSON.parse(savedProgress) });
//     }
//   }, []);

//   // Save progress to localStorage whenever state changes
//   useEffect(() => {
//     localStorage.setItem('audioPlayerProgress', JSON.stringify(state));
//   }, [state]);

//   const completeLevel = (difficulty, level) => {
//     dispatch({ type: 'COMPLETE_LEVEL', payload: { difficulty, level } });
//   };

//   const resetProgress = () => {
//     dispatch({ type: 'RESET_PROGRESS' });
//   };

//   const getTotalCompletedLevels = () => {
//     return state.easy.completedLevels.length + 
//            state.medium.completedLevels.length + 
//            state.hard.completedLevels.length;
//   };

//   const getPlayerLevel = () => {
//     return Math.floor(state.totalExperience / 100) + 1;
//   };

//   const getExpForNextLevel = () => {
//     const currentPlayerLevel = getPlayerLevel();
//     const expForNextLevel = currentPlayerLevel * 100;
//     const currentExp = state.totalExperience % 100;
//     return { current: currentExp, needed: 100 };
//   };

//   const value = {
//     ...state,
//     completeLevel,
//     resetProgress,
//     getTotalCompletedLevels,
//     getPlayerLevel,
//     getExpForNextLevel
//   };

//   return (
//     <ProgressContext.Provider value={value}>
//       {children}
//     </ProgressContext.Provider>
//   );
// };

// export const useProgress = () => {
//   const context = useContext(ProgressContext);
//   if (!context) {
//     throw new Error('useProgress must be used within a ProgressProvider');
//   }
//   return context;
// };