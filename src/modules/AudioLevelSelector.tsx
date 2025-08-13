// const AudioLevelSelector = ({onChange}) => {
//     const levels = ['Easy', 'Medium', 'Hard'];

//     const getLevelClass = (level: string) => {
//       switch(level) {
//           case 'Easy':
//               return 'elementary-level';
//           case 'Medium':
//               return 'intermediate-level';
//           case 'Hard':
//               return 'advanced-level';
//           default:
//               return '';
//       }
//   };

//     return (
//       <div className='level-container'>
//         <button className='blank'></button>
//         <h1 className='header-levels'>Select the Level:</h1>
//         {levels.map(level => (
//           <button 
//             key={level} 
//             onClick={() => onChange(level)} 
//             className={`btn-choose ${getLevelClass(level)}`}
//           >
//             <div className='hidden-content-levels'>
//               <div className="lvlname"> {level}</div> 
//             </div>
//           </button>
//         ))}
//       </div>
//     );
// }

// export default AudioLevelSelector