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
  const [randomFaceIndex, setRandomFaceIndex] = useState(0);
  const ballImagesRef = useRef([]);
  const audioRef = useRef(null);
  const gameoverAudioRef = useRef(null);
  const gameStateRef = useRef({
    ball: { x: 165, y: 280, dx: 2.5, dy: -2.5, radius: 28 },
    paddle: { x: 115, y: 540, width: 90, height: 18 },
    keys: { left: false, right: false },
    mouseX: 165,
    touchX: null,
    canScore: true // スコアカウント可能フラグ
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
      
      gameoverAudioRef.current = new Audio('/gameover_sound.mp4');
      gameoverAudioRef.current.preload = 'auto';
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
    if (!canvas) return;
    
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
      const scaleX = canvas.width / rect.width;
      state.mouseX = (e.clientX - rect.left) * scaleX;
      state.touchX = null; // マウス操作時はタッチをリセット
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      state.touchX = (e.touches[0].clientX - rect.left) * scaleX;
    };

    const handleTouchStart = (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      state.touchX = (e.touches[0].clientX - rect.left) * scaleX;
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

      // キーボード操作
      if (state.keys.left && state.paddle.x > 0) {
        state.paddle.x -= 6;
      }
      if (state.keys.right && state.paddle.x < canvas.width - state.paddle.width) {
        state.paddle.x += 6;
      }
      
      // マウス/タッチ操作（キーボード操作していない時のみ）
      if (!state.keys.left && !state.keys.right) {
        const targetX = state.touchX !== null ? state.touchX : state.mouseX;
        state.paddle.x = Math.max(0, Math.min(canvas.width - state.paddle.width, targetX - state.paddle.width / 2));
      }

      // ボール移動
      state.ball.x += state.ball.dx;
      state.ball.y += state.ball.dy;

      // 壁との衝突(左右)
      if (state.ball.x + state.ball.radius > canvas.width || state.ball.x - state.ball.radius < 0) {
        state.ball.dx *= -1;
      }

      // 壁との衝突(上)
      if (state.ball.y - state.ball.radius < 0) {
        state.ball.dy *= -1;
      }

      // パドルとの衝突判定（より正確に）
      if (
        state.ball.y + state.ball.radius >= state.paddle.y &&
        state.ball.y - state.ball.radius <= state.paddle.y + state.paddle.height &&
        state.ball.x + state.ball.radius >= state.paddle.x &&
        state.ball.x - state.ball.radius <= state.paddle.x + state.paddle.width &&
        state.ball.dy > 0 && // 下方向に移動中のみ
        state.canScore // スコアカウント可能な時のみ
      ) {
        state.ball.dy *= -1;
        // ボールをパドルの上に配置（めり込み防止）
        state.ball.y = state.paddle.y - state.ball.radius;
        state.canScore = false; // スコアカウントを一時的に無効化
        
        const newScore = score + 1;
        setScore(newScore);
        
        // 緩やかな加速（15回くらいまで打てるように）
        const speedIncrease = 1 + (newScore * 0.01); // 1回ごとに1%加速
        state.ball.dx = (state.ball.dx > 0 ? 2.5 : -2.5) * speedIncrease;
        state.ball.dy = (state.ball.dy > 0 ? 2.5 : -2.5) * speedIncrease;
        
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
      
      // ボールがパドルから離れたらスコアカウントを再度有効化
      if (state.ball.y < state.paddle.y - state.ball.radius - 10) {
        state.canScore = true;
      }

      // ゲームオーバー判定
      if (state.ball.y - state.ball.radius > canvas.height) {
        setGameOver(true);
        setRandomFaceIndex(Math.floor(Math.random() * 3)); // ランダムな顔を選択
        
        // ゲームオーバー音声再生
        if (gameoverAudioRef.current) {
          try {
            gameoverAudioRef.current.currentTime = 0;
            gameoverAudioRef.current.play().catch(e => console.log('ゲームオーバー音声再生エラー:', e));
          } catch (error) {
            console.log('ゲームオーバー音声再生エラー:', error);
          }
        }
        
        if (score > 0 && playerName.trim()) {
          saveScore(playerName);
        }
        return;
      }

      // 描画
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ボール描画
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

      // パドル描画
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
    state.ball = { x: 165, y: 280, dx: 2.5, dy: -2.5, radius: 28 };
    state.paddle = { x: 115, y: 540, width: 90, height: 18 };
    state.touchX = null;
    state.mouseX = 165;
    state.canScore = true;
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

  // ゲームオーバー画面（専用ページ）
  if (gameOver) {
    const faceImages = [
      '/597363557_1382929170227011_7254410831971597137_n.jpg',
      '/598538302_1923393485056111_1829447140792257741_n.jpg',
      '/598688071_1569504800708782_7631727797907983873_n.jpg'
    ];
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#1f2937', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '4rem', fontWeight: 'bold', color: '#dc2626', marginBottom: '2rem', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>GAME OVER</h1>
          
          <div style={{ marginBottom: '2rem' }}>
            <img 
              src={faceImages[randomFaceIndex]} 
              alt="face" 
              style={{ 
                width: '200px', 
                height: '200px', 
                borderRadius: '50%', 
                objectFit: 'cover',
                border: '6px solid white',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
              }} 
            />
          </div>
          
          <p style={{ fontSize: '1.5rem', color: 'white', marginBottom: '0.5rem' }}>{playerName}さんのスコア</p>
          <p style={{ fontSize: '3rem', fontWeight: 'bold', color: '#10b981', marginBottom: '2rem' }}>{score}回</p>
          
          <button
            onClick={resetGame}
            style={{ 
              padding: '1rem 3rem', 
              backgroundColor: '#10b981', 
              color: 'white', 
              borderRadius: '0.5rem', 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              border: 'none', 
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}  
          >
            スタートに戻る
          </button>
        </div>
      </div>
    );
  }

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
        {!started && (
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
      </div>
    </div>
  );
}
