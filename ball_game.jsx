import React, { useEffect, useRef, useState } from 'react';

export default function BallGame() {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [rankings, setRankings] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const ballImagesRef = useRef([]);
  const audioRef = useRef(null);
  const gameStateRef = useRef({
    ball: { x: 180, y: 300, dx: 4, dy: -4, radius: 18 },
    paddle: { x: 130, y: 580, width: 100, height: 20 },
    keys: { left: false, right: false },
    mouseX: 180,
    touchX: 180
  });

  useEffect(() => {
    const loadImages = async () => {
      const imagePaths = [
        '/mnt/user-data/uploads/IMG_2714.jpeg',
        '/mnt/user-data/uploads/IMG_2713.jpeg',
        '/mnt/user-data/uploads/IMG_2712.jpeg'
      ];

      const loadedImages = await Promise.all(
        imagePaths.map(path => {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = path;
          });
        })
      );

      ballImagesRef.current = loadedImages.filter(img => img !== null);
      setImagesLoaded(true);
    };

    loadImages();
    
    // 音声ファイルの読み込み
    audioRef.current = new Audio('/mnt/user-data/outputs/claude/bounce_sound.mp3');
    audioRef.current.preload = 'auto';
  }, []);

  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = async () => {
    try {
      const result = await window.storage.get('ball-game-rankings', true);
      if (result && result.value) {
        setRankings(JSON.parse(result.value));
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
      await window.storage.set('ball-game-rankings', JSON.stringify(updatedRankings), true);
      setRankings(updatedRankings);
    } catch (error) {
      console.log('スコア保存エラー:', error);
    }
  };

  useEffect(() => {
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

    // 初期描画（スタート前）
    if (!started) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // ボール描画（画像）
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
        // フォールバック
        ctx.beginPath();
        ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.closePath();
      }

      // パドル描画
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

      // パドル移動
      if (state.keys.left && state.paddle.x > 0) {
        state.paddle.x -= 6;
      }
      if (state.keys.right && state.paddle.x < canvas.width - state.paddle.width) {
        state.paddle.x += 6;
      }
      
      // マウス/タッチ操作
      const targetX = state.touchX || state.mouseX;
      state.paddle.x = Math.max(0, Math.min(canvas.width - state.paddle.width, targetX - state.paddle.width / 2));

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

      // パドルとの衝突
      if (
        state.ball.y + state.ball.radius > state.paddle.y &&
        state.ball.y - state.ball.radius < state.paddle.y + state.paddle.height &&
        state.ball.x > state.paddle.x &&
        state.ball.x < state.paddle.x + state.paddle.width
      ) {
        state.ball.dy *= -1;
        setScore(s => s + 1);
        
        // 効果音再生（ランダムな再生速度）
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.playbackRate = 0.8 + Math.random() * 0.4; // 0.8〜1.2倍速
          audioRef.current.play().catch(e => console.log('音声再生エラー:', e));
        }
      }

      // ゲームオーバー判定
      if (state.ball.y + state.ball.radius > canvas.height) {
        setGameOver(true);
        if (score > 0 && playerName.trim()) {
          saveScore(playerName);
        }
        return;
      }

      // 描画
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ボール描画（画像）
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
        // フォールバック（画像未読み込み時）
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
  }, [gameOver, started, imagesLoaded]);

  const resetGame = () => {
    const state = gameStateRef.current;
    state.ball = { x: 180, y: 300, dx: 4, dy: -4, radius: 18 };
    state.paddle = { x: 130, y: 580, width: 100, height: 20 };
    state.touchX = 180;
    setScore(0);
    setGameOver(false);
    setStarted(false);
  };

  const startGame = () => {
    setStarted(true);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-4 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-3 text-gray-800">Ball Game</h1>
        <div className="mb-3 text-center">
          <span className="text-lg font-semibold text-gray-700">回数: {score}</span>
        </div>
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            width={360}
            height={640}
            className="border-4 border-gray-800 bg-white max-w-full touch-none"
          />
        </div>
        {!started && !gameOver && (
          <div className="mt-4">
            <div className="mb-4">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="名前を入力してください"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-lg"
                maxLength={20}
                onKeyPress={(e) => e.key === 'Enter' && playerName.trim() && startGame()}
              />
            </div>
            <button
              onClick={startGame}
              disabled={!playerName.trim()}
              className="w-full px-8 py-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-xl font-bold mb-4 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              START
            </button>
            {rankings.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h2 className="text-lg font-bold text-center mb-2 text-gray-800">ランキング TOP10</h2>
                <div className="space-y-1">
                  {rankings.map((entry, index) => (
                    <div key={index} className="flex justify-between items-center text-sm py-1 border-b border-gray-200">
                      <span className="font-semibold text-gray-700">
                        {index + 1}. {entry.name}
                      </span>
                      <span className="text-blue-600 font-bold">{entry.score}回</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {gameOver && (
          <div className="mt-4 text-center">
            <p className="text-xl font-bold text-red-600 mb-3">Game Over!</p>
            <p className="text-lg text-gray-700 mb-4">{playerName}さんのスコア: {score}回</p>
            
            <button
              onClick={resetGame}
              className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-lg"
            >
              もう一度プレイ
            </button>
          </div>
        )}
        {!started && !gameOver && (
          <p className="mt-3 text-xs text-gray-600 text-center">
            操作: タッチまたはマウス移動
          </p>
        )}
      </div>
    </div>
  );
}
