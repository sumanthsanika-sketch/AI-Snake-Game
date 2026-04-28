import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, Music, Trophy, Gamepad2, RotateCcw } from 'lucide-react';

// --- GAME CONSTANTS ---
const GRID_SIZE = 20;
const BASE_SPEED = 120;
const INITIAL_SNAKE = [[10, 10], [10, 11], [10, 12]];
const INITIAL_DIR = [0, -1]; // Up

// --- MUSIC TRACKS ---
const TRACKS = [
  { title: "Neon Drifter (AI Generated)", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { title: "Cybernetic Pulse (AI Generated)", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { title: "Synthwave Nights (AI Generated)", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" }
];

export default function App() {
  // --- STATE: MUSIC PLAYER ---
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- STATE: SNAKE GAME ---
  const [snake, setSnake] = useState<number[][]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<number[]>(INITIAL_DIR);
  // Ref to prevent multiple rapid key presses causing a self-collision
  const lastProcessedDir = useRef<number[]>(INITIAL_DIR);
  const [food, setFood] = useState<number[]>([5, 5]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const gameLoopRef = useRef<number | null>(null);

  // --- HELPERS ---
  const generateFood = useCallback((currentSnake: number[][]) => {
    let newFood;
    while (true) {
      newFood = [
        Math.floor(Math.random() * GRID_SIZE),
        Math.floor(Math.random() * GRID_SIZE)
      ];
      // Prevent food from spawning on snake
      // eslint-disable-next-line no-loop-func
      const onSnake = currentSnake.some(segment => segment[0] === newFood[0] && segment[1] === newFood[1]);
      if (!onSnake) break;
    }
    return newFood;
  }, []);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIR);
    lastProcessedDir.current = INITIAL_DIR;
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    setFood(generateFood(INITIAL_SNAKE));
  };

  // --- GAME LOOP ---
  const moveSnake = useCallback(() => {
    if (gameOver || !gameStarted) return;

    setSnake((prevSnake) => {
      const head = prevSnake[0];
      const newHead = [head[0] + direction[0], head[1] + direction[1]];

      // Check wall collision
      if (
        newHead[0] < 0 || newHead[0] >= GRID_SIZE ||
        newHead[1] < 0 || newHead[1] >= GRID_SIZE
      ) {
        setGameOver(true);
        return prevSnake;
      }

      // Check self collision
      if (prevSnake.some(segment => segment[0] === newHead[0] && segment[1] === newHead[1])) {
        setGameOver(true);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Check food
      if (newHead[0] === food[0] && newHead[1] === food[1]) {
        setScore(s => s + 10);
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop(); // Remove tail
      }

      lastProcessedDir.current = direction;
      return newSnake;
    });
  }, [direction, food, gameOver, gameStarted, generateFood]);

  // Handle Game Over Side Effects
  useEffect(() => {
    if (gameOver && score > highScore) {
      setHighScore(score);
    }
  }, [gameOver, score, highScore]);

  // Start/Stop Game Loop
  useEffect(() => {
    if (gameStarted && !gameOver) {
      gameLoopRef.current = window.setInterval(moveSnake, BASE_SPEED);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [moveSnake, gameStarted, gameOver]);

  // Handle Keyboard Input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStarted && (e.key === 'Enter' || e.key === ' ')) {
        resetGame();
        return;
      }
      
      if (gameOver && e.key === 'Enter') {
        resetGame();
        return;
      }

      // Prevent scrolling
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }

      const lpd = lastProcessedDir.current;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (lpd[1] !== 1) setDirection([0, -1]);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (lpd[1] !== -1) setDirection([0, 1]);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (lpd[0] !== 1) setDirection([-1, 0]);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (lpd[0] !== -1) setDirection([1, 0]);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted, gameOver]);

  // --- AUDIO CONTROLS ---
  useEffect(() => {
    if (audioRef.current) {
      if (isPlayingMusic) {
        audioRef.current.play().catch(e => console.error("Audio playback error:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlayingMusic, currentTrackIdx]);

  const togglePlay = () => setIsPlayingMusic(!isPlayingMusic);
  const nextTrack = () => setCurrentTrackIdx((prev) => (prev + 1) % TRACKS.length);
  const prevTrack = () => setCurrentTrackIdx((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);

  const handleAudioEnd = () => nextTrack();

  // --- RENDER HELPERS ---
  const cells = Array.from({ length: GRID_SIZE * GRID_SIZE });

  return (
    <div className="min-h-screen relative overflow-hidden bg-[var(--color-dark)] flex flex-col md:flex-row items-center justify-center p-4 screen-tear select-none">
      {/* BACKGROUND ELEMENTS */}
      <div className="scanline-effect"></div>
      <div className="absolute inset-0 static-noise z-50 pointer-events-none"></div>
      <div className="absolute inset-0 bg-glitch-pattern z-0 opacity-20 pointer-events-none"></div>

      {/* AUDIO ELEMENT HIDDEN */}
      <audio 
        ref={audioRef} 
        src={TRACKS[currentTrackIdx].url} 
        onEnded={handleAudioEnd} 
      />

      <div className="relative z-10 flex flex-col xl:flex-row w-full max-w-7xl items-center justify-center gap-8 xl:gap-16">
        
        {/* LEFT/TOP PANEL: MUSIC & INFO */}
        <div className="flex flex-col gap-6 w-full max-w-sm shrink-0 font-[var(--font-vt)]">
          {/* MUSIC PLAYER WIDGET */}
          <div className="bg-black border border-[var(--color-cyan)] border-b-4 border-r-4 p-6 relative overflow-hidden shadow-[8px_8px_0_var(--color-magenta)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-[var(--color-cyan)] bg-[var(--color-magenta)] p-1 inline-block">
                <Music size={24} className="mix-blend-difference" />
              </div>
              <h2 className="text-[var(--color-cyan)] font-bold tracking-widest text-xl uppercase font-[var(--font-pixel)] glitch-text" data-text="AURAL_SYS">
                AURAL_SYS
              </h2>
            </div>
            
            <div className="mb-6 font-[var(--font-vt)] text-lg">
              <div className="text-[var(--color-magenta)] uppercase tracking-wider mb-1 opacity-80">&gt; TRK_SRC:</div>
              <div className="text-[var(--color-cyan)] font-bold truncate bg-[var(--color-cyan)]/10 p-2 border-l-4 border-[var(--color-cyan)] uppercase">
                {TRACKS[currentTrackIdx].title}
              </div>
              {/* Fake visualizer */}
              <div className="h-6 flex items-end gap-[2px] mt-4 max-w-full overflow-hidden">
                {[...Array(30)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-full bg-[var(--color-magenta)]"
                    style={{ 
                      height: isPlayingMusic ? `${Math.max(10, Math.random() * 100)}%` : '10%',
                      transition: 'height 0.1s steps(2)'
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t-2 border-dashed border-[var(--color-cyan)]/30 pt-4">
              <button onClick={prevTrack} className="hover:text-[var(--color-magenta)] transition-colors p-2 text-[var(--color-cyan)]">
                <SkipBack size={24} />
              </button>
              
              <button 
                onClick={togglePlay}
                className="btn-glitch w-14 h-14 flex items-center justify-center"
              >
                {isPlayingMusic ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
              </button>
              
              <button onClick={nextTrack} className="hover:text-[var(--color-magenta)] transition-colors p-2 text-[var(--color-cyan)]">
                <SkipForward size={24} />
              </button>
            </div>
          </div>

          {/* SCORES WIDGET */}
          <div className="bg-black border border-[var(--color-magenta)] border-b-4 border-r-4 p-6 shadow-[8px_8px_0_var(--color-cyan)]">
            <div className="flex items-center gap-3 mb-4 border-b-2 border-dashed border-[var(--color-magenta)]/30 pb-2">
              <div className="text-[var(--color-magenta)] bg-[var(--color-cyan)] p-1">
                <Trophy size={20} className="mix-blend-difference" />
              </div>
              <h2 className="text-[var(--color-magenta)] tracking-widest text-xl uppercase font-[var(--font-pixel)] glitch-text" data-text="MEM_DATA">
                MEM_DATA
              </h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-center mt-4">
              <div className="flex flex-col border border-[var(--color-cyan)] bg-[var(--color-cyan)]/5 p-2">
                <div className="text-[var(--color-cyan)] text-sm uppercase opacity-80">SCORE</div>
                <div className="text-3xl font-[var(--font-pixel)] text-[var(--color-cyan)] mt-2">{score}</div>
              </div>
              <div className="flex flex-col border border-[var(--color-magenta)] bg-[var(--color-magenta)]/5 p-2">
                <div className="text-[var(--color-magenta)] text-sm uppercase opacity-80">PEAK</div>
                <div className="text-3xl font-[var(--font-pixel)] text-[var(--color-magenta)] mt-2">{highScore}</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT/CENTER: GAME STAGE */}
        <div className="relative shrink-0 flex flex-col items-center">
          <div className="mb-4 flex items-center gap-3 self-start md:self-center bg-black/50 p-2 border border-[var(--color-cyan)]">
            <Gamepad2 className="text-[var(--color-cyan)]" size={24} />
            <h1 className="text-xl md:text-2xl font-[var(--font-pixel)] text-[var(--color-cyan)] uppercase tracking-widest glitch-text" data-text="SYSTEM_SNAKE.EXE">
              SYSTEM_SNAKE.EXE
            </h1>
          </div>

          <div className="relative bg-black border-[4px] border-[var(--color-magenta)] p-2 shadow-[8px_8px_0_var(--color-cyan)]">
            
            {/* Game Canvas / Grid */}
            <div 
              className="relative bg-[var(--color-dark)] w-[90vw] h-[90vw] max-w-[400px] max-h-[400px] sm:w-[400px] sm:h-[400px] grid border border-[var(--color-cyan)]/30"
              style={{
                gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`
              }}
            >
              {/* grid lines */}
              <div className="absolute inset-0 pointer-events-none opacity-20"
                style={{ backgroundImage: 'linear-gradient(var(--color-cyan) 1px, transparent 1px), linear-gradient(90deg, var(--color-cyan) 1px, transparent 1px)', backgroundSize: '100% 5%, 5% 100%' }}>
              </div>

              {cells.map((_, i) => {
                const x = i % GRID_SIZE;
                const y = Math.floor(i / GRID_SIZE);
                
                const isSnake = snake.some(segment => segment[0] === x && segment[1] === y);
                const isHead = snake[0][0] === x && snake[0][1] === y;
                const isFoodNode = food[0] === x && food[1] === y;

                let cellClass = "";
                let style = {};

                if (isHead) {
                  cellClass = "bg-[var(--color-cyan)] z-10 box-border";
                  style = { border: '2px solid var(--color-dark)' };
                } else if (isSnake) {
                  cellClass = "bg-[var(--color-cyan)] opacity-70 box-border";
                  style = { border: '1px solid var(--color-dark)' };
                } else if (isFoodNode) {
                  cellClass = "bg-[var(--color-magenta)] z-10 shadow-[0_0_8px_var(--color-magenta)] animate-pulse border border-[var(--color-cyan)]";
                }

                return (
                  <div key={i} className={`flex items-center justify-center p-[1px]`}>
                    <div className={`w-full h-full ${cellClass}`} style={style} />
                  </div>
                );
              })}
            </div>

            {/* Overlays */}
            {!gameStarted && !gameOver && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--color-dark)]/90 border border-[var(--color-cyan)]">
                <button 
                  onClick={resetGame}
                  className="btn-glitch px-6 py-4 font-[var(--font-pixel)] text-lg flex items-center gap-3 mb-6"
                >
                  <Play fill="currentColor" size={16} />
                  INITIATE
                </button>
                <div className="text-[var(--color-cyan)]/70 text-base font-[var(--font-vt)] uppercase flex flex-col items-center gap-2">
                  <span>&gt; CTRLS: [W A S D] / [ARROWS]</span>
                  <span className="animate-pulse">&gt; AWAITING INPUT_</span>
                </div>
              </div>
            )}

            {gameOver && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--color-dark)]/90 border-[2px] border-[var(--color-magenta)]">
                <h2 className="text-3xl lg:text-4xl text-[var(--color-magenta)] mb-4 font-[var(--font-pixel)] glitch-text" data-text="FATAL_ERR">FATAL_ERR</h2>
                <div className="text-[var(--color-cyan)] font-[var(--font-vt)] mb-8 text-xl border-l-[4px] border-[var(--color-magenta)] bg-[var(--color-magenta)]/10 px-4 py-2 uppercase">
                  <div>&gt; STACK_OVERFLOW</div>
                  <div>&gt; FINAL_SC: {score}</div>
                </div>
                <button 
                  onClick={resetGame}
                  className="btn-glitch px-6 py-4 font-[var(--font-pixel)] text-sm flex items-center gap-3"
                >
                  <RotateCcw size={16} />
                  REBOOT_SEQ
                </button>
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
