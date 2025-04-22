'use client';

import { useState, useEffect, useCallback } from 'react';
import { GameButton, GameState, Difficulty } from '../types/game';

const BUTTONS: GameButton[] = ['green', 'red', 'yellow', 'blue'];

const DIFFICULTY_SETTINGS = {
  easy: {
    delay: 1000,
    multiplier: 1
  },
  medium: {
    delay: 700,
    multiplier: 2
  },
  hard: {
    delay: 400,
    multiplier: 3
  }
};

const SimonGame = () => {
  const [gameState, setGameState] = useState<GameState>({
    sequence: [],
    userSequence: [],
    score: 0,
    isPlaying: false,
    isPlayingSequence: false,
    gameOver: false,
    difficulty: 'medium'
  });

  const [activeButton, setActiveButton] = useState<GameButton | null>(null);
  const [highScores, setHighScores] = useState<Record<Difficulty, number>>({
    easy: 0,
    medium: 0,
    hard: 0
  });

  // Load high scores
  useEffect(() => {
    const savedScores = localStorage.getItem('simonHighScores');
    if (savedScores) {
      setHighScores(JSON.parse(savedScores));
    }
  }, []);

  // Save high score
  const updateHighScore = useCallback((score: number, difficulty: Difficulty) => {
    setHighScores(prev => {
      const newScores = {
        ...prev,
        [difficulty]: Math.max(prev[difficulty], score)
      };
      localStorage.setItem('simonHighScores', JSON.stringify(newScores));
      return newScores;
    });
  }, []);

  // Sound effects
  const playSound = useCallback((button: GameButton) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    const frequencies: Record<GameButton, number> = {
      green: 261.63, // C4
      red: 329.63,   // E4
      yellow: 392.00, // G4
      blue: 523.25    // C5
    };

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = frequencies[button];
    gainNode.gain.value = 0.1;

    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      audioContext.close();
    }, 200);
  }, []);

  // Flash a button
  const flashButton = useCallback(async (button: GameButton, duration: number) => {
    setActiveButton(button);
    playSound(button);
    await new Promise(resolve => setTimeout(resolve, duration));
    setActiveButton(null);
  }, [playSound]);

  // Play the entire sequence
  const playSequence = useCallback(async (sequence: GameButton[]) => {
    setGameState(prev => ({
      ...prev,
      sequence: sequence,
      userSequence: [],
      isPlayingSequence: true
    }));

    const delay = DIFFICULTY_SETTINGS[gameState.difficulty].delay;

    for (let i = 0; i < sequence.length; i++) {
      await flashButton(sequence[i], 300);
      if (i < sequence.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay - 300));
      }
    }
    
    setGameState(prev => ({ ...prev, isPlayingSequence: false }));
  }, [gameState.difficulty, flashButton]);

  // Generate next sequence
  const generateNextSequence = useCallback(() => {
    const randomButton = BUTTONS[Math.floor(Math.random() * BUTTONS.length)];
    return [...gameState.sequence, randomButton];
  }, [gameState.sequence]);

  // Handle button click
  const handleButtonClick = useCallback(async (button: GameButton) => {
    if (gameState.isPlayingSequence || !gameState.isPlaying || gameState.gameOver) return;

    await flashButton(button, 300);

    setGameState(prev => {
      const newUserSequence = [...prev.userSequence, button];
      
      // Wrong button
      if (button !== prev.sequence[newUserSequence.length - 1]) {
        updateHighScore(prev.score, prev.difficulty);
        return {
          ...prev,
          gameOver: true,
          isPlaying: false
        };
      }

      // Correct sequence completed
      if (newUserSequence.length === prev.sequence.length) {
        const newSequence = [...prev.sequence, BUTTONS[Math.floor(Math.random() * BUTTONS.length)]];
        
        // Schedule next sequence playback
        setTimeout(() => {
          playSequence(newSequence);
        }, 1000);

        return {
          ...prev,
          sequence: newSequence,
          userSequence: [],
          score: prev.score + DIFFICULTY_SETTINGS[prev.difficulty].multiplier
        };
      }

      // Correct button but sequence not complete
      return {
        ...prev,
        userSequence: newUserSequence
      };
    });
  }, [gameState.isPlayingSequence, gameState.isPlaying, gameState.gameOver, updateHighScore, flashButton, playSequence]);

  // Start game
  const handleStartGame = useCallback(async () => {
    const initialSequence = [BUTTONS[Math.floor(Math.random() * BUTTONS.length)]];
    
    setGameState(prev => ({
      ...prev,
      sequence: initialSequence,
      userSequence: [],
      score: 0,
      isPlaying: true,
      gameOver: false
    }));

    // Play the initial sequence after a short delay
    setTimeout(() => {
      playSequence(initialSequence);
    }, 500);
  }, [playSequence]);

  // Change difficulty
  const handleDifficultyChange = (difficulty: Difficulty) => {
    setGameState(prev => ({
      ...prev,
      difficulty,
      sequence: [],
      userSequence: [],
      score: 0,
      isPlaying: false,
      gameOver: false
    }));
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Game Header */}
      <div className="w-full max-w-4xl text-center mb-4 sm:mb-8 px-4">
        <h1 className="text-3xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-2 sm:mb-4">
          Simon Game
        </h1>
        
        {/* Difficulty Selector */}
        {!gameState.isPlaying && (
          <div className="flex flex-col items-center space-y-4 mb-4">
            <p className="text-gray-400 text-sm sm:text-lg mb-2">Select Difficulty</p>
            <div className="flex space-x-2 sm:space-x-4">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((difficulty) => (
                <button
                  key={difficulty}
                  onClick={() => handleDifficultyChange(difficulty)}
                  className={`
                    px-4 py-2 rounded-full text-sm sm:text-base font-semibold
                    transition-all duration-200 transform hover:scale-105
                    focus:outline-none focus:ring-2 focus:ring-opacity-50
                    ${gameState.difficulty === difficulty
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }
                  `}
                >
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </button>
              ))}
            </div>
            
            {/* High Scores */}
            <div className="grid grid-cols-3 gap-4 mt-2">
              {Object.entries(highScores).map(([diff, score]) => (
                <div key={diff} className="text-center">
                  <p className="text-gray-400 text-xs sm:text-sm capitalize">{diff}</p>
                  <p className="text-purple-400 font-bold">{score}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Game Board */}
      <div className="relative w-[min(90vw,90vh)] h-[min(90vw,90vh)] max-w-[500px] max-h-[500px]">
        <div className="absolute inset-0 bg-gray-800 rounded-full shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full opacity-50"></div>
        </div>
        
        <div className="relative w-full h-full p-[8%]">
          <div className="grid grid-cols-2 gap-[8%] w-full h-full">
            {BUTTONS.map((button) => (
              <button
                key={button}
                onClick={() => handleButtonClick(button)}
                disabled={gameState.isPlayingSequence || !gameState.isPlaying || gameState.gameOver}
                tabIndex={0}
                aria-label={`${button} button`}
                className={`
                  relative
                  rounded-full
                  transition-all
                  duration-200
                  transform
                  active:scale-95
                  focus:outline-none
                  focus:ring-4
                  focus:ring-white
                  focus:ring-opacity-50
                  shadow-lg
                  ${button === 'green' && 'bg-gradient-to-br from-green-400 to-green-600'}
                  ${button === 'red' && 'bg-gradient-to-br from-red-400 to-red-600'}
                  ${button === 'yellow' && 'bg-gradient-to-br from-yellow-400 to-yellow-600'}
                  ${button === 'blue' && 'bg-gradient-to-br from-blue-400 to-blue-600'}
                  ${activeButton === button ? 'brightness-150 scale-95' : 'brightness-100'}
                  ${gameState.isPlayingSequence || !gameState.isPlaying ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
                `}
              />
            ))}
          </div>
        </div>

        {/* Center Circle */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[30%] h-[30%] min-w-[100px] min-h-[100px] bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex flex-col items-center justify-center shadow-2xl border-4 border-gray-700">
          {gameState.gameOver ? (
            <div className="text-center p-2">
              <p className="text-red-500 font-bold text-base sm:text-xl mb-1">Game Over!</p>
              <p className="text-gray-400 text-sm sm:text-base mb-2">Score: {gameState.score}</p>
              <button
                onClick={handleStartGame}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 transform active:scale-95 transition-all duration-200 shadow-lg"
              >
                Play Again
              </button>
            </div>
          ) : !gameState.isPlaying ? (
            <button
              onClick={handleStartGame}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm sm:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 transform active:scale-95 transition-all duration-200 shadow-lg"
            >
              Start
            </button>
          ) : (
            <div className="text-center">
              <p className="text-gray-400 text-xs sm:text-sm font-semibold mb-1">Score</p>
              <p className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                {gameState.score}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Game Status */}
      <div className="mt-4 sm:mt-8 text-center">
        <p className="text-gray-400 text-sm sm:text-base">
          {gameState.isPlayingSequence 
            ? "Watch the sequence..." 
            : gameState.isPlaying 
              ? "Your turn!" 
              : "Press Start to play"}
        </p>
        {gameState.isPlaying && (
          <div className="text-xs sm:text-sm text-gray-500 mt-2">
            <p>Difficulty: {gameState.difficulty.charAt(0).toUpperCase() + gameState.difficulty.slice(1)}</p>
            <p>Sequence Length: {gameState.sequence.length}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimonGame; 