import React, { useEffect, useRef, useState } from 'react';

export default function App() {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [rankings, setRankings] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const ballImagesRef = useRef([]);
  const audioRef = useRef(null);
  const gameStateRef = useRef({
    ball: { x: 165, y: 280, dx: 4, dy: -4, radius: 16 },
    paddle: { x: 115, y: 540, width: 90, height: 18 },
    keys: { left: false, right: false },
    mouseX: 165,
    touchX: 165
  });

  useEffect(() => {
    const loadImages = async () => {
      const imagePaths = [
        '/597363557_1382929170227011_7254410831971597137_n.jpg',
        '/598538302_1923393485056111_1829447140792257741_n.jpg',
        '/598688071_1569504800708782_7631727797907983873_n.jpg'
      ];

      const loadedImages = await Promise.all(
        imagePaths.map(path => {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => {
              console.log(`画像読み込み失敗: ${path}`);
              resolve(null);
            };
            img.src = path;
          });
        })
      );

      ballImagesRef.current = loadedImages.filter(img => img !== null);
      setImagesLoaded(true);
    };

    loadImages();
    
    try {
      audioRef.current = new Audio('/レコーディング 2025-12-18 180109.mp4');
      audioRef.current.preload = 'auto';
    } catch (error) {
      console.log('音声読み込みエラー:', error);
    }
  }, []);

  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = async () => {
    try {
      const stored = localStorage.getItem('ball-game-rankings');
      if (stored) {
        setRankings(JSON.parse(stored));
      }
    } catch (error) {
      console.log('ランキング読み込みエラー:', error);
      setRankings([]);
    }
  };

  const saveScore = async (name) => {
    if (!name.trim()) return;
    
    const newEntry = {
      name: name.trim(),
      score: score,
      timestamp: new Date().toISOString()
    };

    const updatedRankings = [...rankings, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    try {
      localStorage.setItem('ball-game-rankings', JSON.stringify(updatedRankings));
      setRankings(updatedRankings);
    } catch (error) {
      console.log('スコア保存エラー:', error);
    }
  };

  useEffect(() => {
    if (!showGame) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const state = gameStateRef.current;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') state.keys.left = true;
      if (e.key === 'ArrowRight') state.keys.right = true;
    };

    const handleKeyUp = (e) => {
      if (e.key === 'ArrowLeft') state.keys.left = false;
      if (e.key === 'ArrowRight') state.keys.right = false;
    };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      state.mouseX = e.clientX - rect.left;
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      state.touchX = e.touches[0].clientX - rect.left;
    };

    const handleTouchStart = (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      state.touchX = e.touches[0].clientX - rect.left;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

    if (!started) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (ballImagesRef.current.length > 0) {
        const img = ballImagesRef.current[0];
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        
        const size = state.ball.radius * 2;
        ctx.drawImage(
          img,
          state.ball.x - state.ball.radius,
          state.ball.y - state.ball.radius,
          size,
          size
        );
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.closePath();
      }

      ctx.fillStyle = '#1f2937';
      ctx.fillRect(state.paddle.x, state.paddle.y, state.paddle.width, state.paddle.height);
      
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchstart', handleTouchStart);
      };
    }

    const gameLoop = () => {
      if (gameOver || !started) return;

      if (state.keys.left && state.paddle.x > 0) {
        state.paddle.x -= 6;
      }
      if (state.keys.right && state.paddle.x < canvas.width - state.paddle.width) {
        state.paddle.x += 6;
      }
      
      const targetX = state.touchX || state.mouseX;
      state.paddle.x = Math.max(0, Math.min(canvas.width - state.paddle.width, targetX - state.paddle.width / 2));

      state.ball.x += state.ball.dx;
      state.ball.y += state.ball.dy;

      if (state.ball.x + state.ball.radius > canvas.width || state.ball.x - state.ball.radius < 0) {
        state.ball.dx *= -1;
      }

      if (state.ball.y - state.ball.radius < 0) {
        state.ball.dy *= -1;
      }

      if (
        state.ball.y + state.ball.radius > state.paddle.y &&
        state.ball.y - state.ball.radius < state.paddle.y + state.paddle.height &&
        state.ball.x > state.paddle.x &&
        state.ball.x < state.paddle.x + state.paddle.width
      ) {
        state.ball.dy *= -1;
        setScore(s => s + 1);
        
        if (audioRef.current) {
          try {
            audioRef.current.currentTime = 0;
            audioRef.current.playbackRate = 0.8 + Math.random() * 0.4;
            audioRef.current.play().catch(e => console.log('音声再生エラー:', e));
          } catch (error) {
            console.log('音声再生エラー:', error);
          }
        }
      }

      if (state.ball.y + state.ball.radius > canvas.height) {
        setGameOver(true);
        if (score > 0 && playerName.trim()) {
          saveScore(playerName);
        }
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (ballImagesRef.current.length > 0) {
        const imageIndex = Math.floor(score / 10) % ballImagesRef.current.length;
        const img = ballImagesRef.current[imageIndex];
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        
        const size = state.ball.radius * 2;
        ctx.drawImage(
          img,
          state.ball.x - state.ball.radius,
          state.ball.y - state.ball.radius,
          size,
          size
        );
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.closePath();
      }

      ctx.fillStyle = '#1f2937';
      ctx.fillRect(state.paddle.x, state.paddle.y, state.paddle.width, state.paddle.height);

      requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchstart', handleTouchStart);
    };
  }, [gameOver, started, imagesLoaded, showGame, score, playerName]);

  const resetGame = () => {
    const state = gameStateRef.current;
    state.ball = { x: 165, y: 280, dx: 4, dy: -4, radius: 16 };
    state.paddle = { x: 115, y: 540, width: 90, height: 18 };
    state.touchX = 165;
    setScore(0);
    setGameOver(false);
    setStarted(false);
    setShowGame(false);
  };

  const startGame = () => {
    setStarted(true);
  };

  const goToGame = () => {
    if (playerName.trim()) {
      setShowGame(true);
    }
  };

  if (!showGame) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '1rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '28rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '1.5rem', color: '#1f2937' }}>Ball Game</h1>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="名前を入力してください"
              style={{ width: '100%', padding: '0.75rem 1rem', border: '2px solid #d1d5db', borderRadius: '0.5rem', textAlign: 'center', fontSize: '1.125rem' }}
              maxLength={20}
              onKeyPress={(e) => e.key === 'Enter' && playerName.trim() && goToGame()}
            />
          </div>
          
          <button
            onClick={goToGame}
            disabled={!playerName.trim()}
            style={{ width: '100%', padding: '1rem 2rem', backgroundColor: playerName.trim() ? '#10b981' : '#d1d5db', color: 'white', borderRadius: '0.5rem', fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', cursor: playerName.trim() ? 'pointer' : 'not-allowed', border: 'none' }}
          >
            START
          </button>
          
          {rankings.length > 0 && (
            <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '0.75rem', color: '#1f2937' }}>ランキング TOP10</h2>
              <div>
                {rankings.map((entry, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontWeight: '600', color: '#374151' }}>
                      {index + 1}. {entry.name}
                    </span>
                    <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{entry.score}回</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '1rem' }}>
      <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '0.5rem', color: '#1f2937' }}>Ball Game</h1>
        <div style={{ marginBottom: '0.5rem', textAlign: 'center' }}>
          <span style={{ fontSize: '1rem', fontWeight: '600', color: '#374151' }}>回数: {score}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <canvas
            ref={canvasRef}
            width={330}
            height={580}
            style={{ border: '4px solid #1f2937', backgroundColor: 'white', maxWidth: '100%', touchAction: 'none' }}
          />
        </div>
        {!started && !gameOver && (
          <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
            <button
              onClick={startGame}
              style={{ padding: '0.75rem 2rem', backgroundColor: '#10b981', color: 'white', borderRadius: '0.5rem', fontSize: '1.125rem', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
            >
              ゲーム開始
            </button>
            <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
              操作: タッチまたはマウス移動
            </p>
          </div>
        )}
        {gameOver && (
          <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
            <p style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#dc2626', marginBottom: '0.5rem' }}>Game Over!</p>
            <p style={{ fontSize: '1rem', color: '#374151', marginBottom: '0.75rem' }}>{playerName}さんのスコア: {score}回</p>
            
            <button
              onClick={resetGame}
              style={{ padding: '0.5rem 1.5rem', backgroundColor: '#10b981', color: 'white', borderRadius: '0.5rem', fontSize: '1rem', border: 'none', cursor: 'pointer' }}
            >
              タイトルに戻る
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
