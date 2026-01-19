import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Play, RotateCcw, Plus, X, Minus } from 'lucide-react';
import AdBanner from '../../components/ads/AdBanner';

type GameState = 'setup' | 'spinning' | 'result';

type WheelItem = {
  id: string;
  name: string;
  weight: number; // 넓이 가중치
};

const COLORS = [
  '#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6',
  '#1ABC9C', '#E91E63', '#00BCD4', '#FF5722', '#795548',
];

export default function DartGame() {
  const [gameState, setGameState] = useState<GameState>('setup');
  const [items, setItems] = useState<WheelItem[]>([
    { id: '1', name: '당첨!', weight: 1 },
    { id: '2', name: '꽝', weight: 5 },
    { id: '3', name: '다시', weight: 2 },
    { id: '4', name: '커피사기', weight: 1 },
  ]);
  const [itemInput, setItemInput] = useState('');
  const [rotation, setRotation] = useState(0);
  const [selectedItem, setSelectedItem] = useState<WheelItem | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);

  const addItem = () => {
    if (itemInput.trim() && items.length < 10) {
      setItems([...items, {
        id: Date.now().toString(),
        name: itemInput.trim(),
        weight: 1,
      }]);
      setItemInput('');
    }
  };

  const removeItem = (id: string) => {
    if (items.length > 2) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateWeight = (id: string, delta: number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const newWeight = Math.max(1, Math.min(10, item.weight + delta));
        return { ...item, weight: newWeight };
      }
      return item;
    }));
  };

  const spinWheel = () => {
    if (isSpinning || items.length < 2) return;

    setIsSpinning(true);
    setGameState('spinning');
    setSelectedItem(null);

    // 랜덤 회전 (최소 5바퀴 + 랜덤)
    const spins = 5 + Math.random() * 3;
    const randomAngle = Math.random() * 360;
    const totalRotation = rotation + (spins * 360) + randomAngle;

    setRotation(totalRotation);

    // 결과 계산 (3초 후)
    setTimeout(() => {
      // 최종 각도 계산 (0-360)
      const finalAngle = (360 - (totalRotation % 360) + 90) % 360;

      // 가중치 기반으로 어떤 항목인지 찾기
      let accumulatedAngle = 0;
      let selected: WheelItem | null = null;

      for (const item of items) {
        const itemAngle = (item.weight / totalWeight) * 360;
        if (finalAngle >= accumulatedAngle && finalAngle < accumulatedAngle + itemAngle) {
          selected = item;
          break;
        }
        accumulatedAngle += itemAngle;
      }

      // 못 찾으면 마지막 항목
      if (!selected) selected = items[items.length - 1];

      setSelectedItem(selected);
      setGameState('result');
      setIsSpinning(false);
    }, 3000);
  };

  const resetGame = () => {
    setGameState('setup');
    setSelectedItem(null);
    setRotation(0);
  };

  // SVG 파이 조각 경로 생성 (가중치 기반)
  const createSegmentPath = (startAngle: number, endAngle: number, radius: number) => {
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = radius + radius * Math.cos(startRad);
    const y1 = radius + radius * Math.sin(startRad);
    const x2 = radius + radius * Math.cos(endRad);
    const y2 = radius + radius * Math.sin(endRad);

    const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;

    return `M ${radius} ${radius} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  // 텍스트 위치 계산 (가중치 기반)
  const getTextPosition = (startAngle: number, endAngle: number, radius: number) => {
    const midAngle = ((startAngle + endAngle) / 2 - 90) * (Math.PI / 180);
    const textRadius = radius * 0.65;

    return {
      x: radius + textRadius * Math.cos(midAngle),
      y: radius + textRadius * Math.sin(midAngle),
      rotation: (startAngle + endAngle) / 2,
    };
  };

  // 각 항목의 시작/끝 각도 계산
  const getItemAngles = () => {
    const angles: { item: WheelItem; start: number; end: number; color: string }[] = [];
    let currentAngle = 0;

    items.forEach((item, idx) => {
      const itemAngle = (item.weight / totalWeight) * 360;
      angles.push({
        item,
        start: currentAngle,
        end: currentAngle + itemAngle,
        color: COLORS[idx % COLORS.length],
      });
      currentAngle += itemAngle;
    });

    return angles;
  };

  const itemAngles = getItemAngles();

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', paddingBottom: '2rem' }}>
      {/* Setup Phase */}
      {gameState === 'setup' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Target size={48} color="var(--color-primary)" style={{ marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.8rem', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
              다트 게임
            </h2>
            <p style={{ color: 'var(--color-text-light)' }}>항목과 확률(넓이)을 설정하세요</p>
          </div>

          {/* 항목 입력 */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              type="text"
              value={itemInput}
              onChange={(e) => setItemInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addItem()}
              placeholder="항목 입력"
              style={{
                flex: 1,
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                border: '2px solid #ddd',
                fontSize: '1rem',
                outline: 'none',
              }}
            />
            <button
              onClick={addItem}
              disabled={items.length >= 10}
              style={{
                padding: '1rem 1.5rem',
                background: items.length >= 10 ? '#ddd' : 'var(--color-primary)',
                color: 'white',
                borderRadius: 'var(--radius-lg)',
                border: 'none',
                cursor: items.length >= 10 ? 'not-allowed' : 'pointer',
              }}
            >
              <Plus size={20} />
            </button>
          </div>

          {/* 항목 목록 (가중치 조절 포함) */}
          <div style={{
            background: 'var(--color-white)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem',
            marginBottom: '1.5rem',
            border: '1px solid #eee',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
              fontSize: '0.8rem',
              color: 'var(--color-text-light)',
              padding: '0 0.5rem',
            }}>
              <span>항목</span>
              <span>넓이 (확률)</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {items.map((item, idx) => {
                const percentage = ((item.weight / totalWeight) * 100).toFixed(1);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.6rem 0.8rem',
                      background: '#f8f8f8',
                      borderRadius: '10px',
                    }}
                  >
                    {/* 색상 표시 */}
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      background: COLORS[idx % COLORS.length],
                      flexShrink: 0,
                    }} />

                    {/* 항목 이름 */}
                    <span style={{ flex: 1, fontWeight: '500' }}>{item.name}</span>

                    {/* 퍼센트 표시 */}
                    <span style={{
                      fontSize: '0.8rem',
                      color: 'var(--color-text-light)',
                      minWidth: '45px',
                      textAlign: 'right',
                    }}>
                      {percentage}%
                    </span>

                    {/* 가중치 조절 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      background: 'white',
                      borderRadius: '8px',
                      padding: '0.2rem',
                      border: '1px solid #ddd',
                    }}>
                      <button
                        onClick={() => updateWeight(item.id, -1)}
                        disabled={item.weight <= 1}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          border: 'none',
                          background: item.weight <= 1 ? '#f0f0f0' : '#eee',
                          cursor: item.weight <= 1 ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Minus size={14} />
                      </button>
                      <span style={{
                        minWidth: '24px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                      }}>
                        {item.weight}
                      </span>
                      <button
                        onClick={() => updateWeight(item.id, 1)}
                        disabled={item.weight >= 10}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          border: 'none',
                          background: item.weight >= 10 ? '#f0f0f0' : '#eee',
                          cursor: item.weight >= 10 ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* 삭제 버튼 */}
                    {items.length > 2 && (
                      <button
                        onClick={() => removeItem(item.id)}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          border: 'none',
                          background: '#ffebee',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <X size={14} color="#e53935" />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          <p style={{
            textAlign: 'center',
            marginBottom: '1rem',
            color: 'var(--color-text-light)',
            fontSize: '0.85rem',
          }}>
            숫자가 클수록 넓이가 넓어져 당첨 확률이 높아집니다
          </p>

          <button
            onClick={() => { setGameState('spinning'); }}
            disabled={items.length < 2}
            style={{
              width: '100%',
              padding: '1rem',
              background: items.length >= 2 ? 'var(--color-primary)' : '#ddd',
              color: 'white',
              borderRadius: 'var(--radius-lg)',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              border: 'none',
              cursor: items.length >= 2 ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <Play size={20} />
            게임 시작!
          </button>
        </motion.div>
      )}

      {/* Spinning / Result Phase */}
      {(gameState === 'spinning' || gameState === 'result') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* 상단 컨트롤 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
          }}>
            <h3 style={{ color: 'var(--color-primary)', fontSize: '1.3rem' }}>
              {isSpinning ? '🎯 돌아가는 중...' : selectedItem ? '🎉 결과!' : '🎯 다트 던지기'}
            </h3>
            <button
              onClick={resetGame}
              style={{
                padding: '0.5rem 1rem',
                background: 'var(--color-text)',
                color: 'white',
                borderRadius: '20px',
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <RotateCcw size={16} /> 처음으로
            </button>
          </div>

          {/* 룰렛 */}
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '350px',
            margin: '0 auto 2rem',
          }}>
            {/* 화살표 (포인터) */}
            <div style={{
              position: 'absolute',
              right: '-15px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 20,
              fontSize: '2.5rem',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            }}>
              👉
            </div>

            {/* 중앙 버튼 */}
            <motion.button
              onClick={spinWheel}
              disabled={isSpinning}
              whileHover={!isSpinning ? { scale: 1.1 } : {}}
              whileTap={!isSpinning ? { scale: 0.95 } : {}}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: isSpinning ? '#ccc' : 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)',
                border: '4px solid white',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                color: 'white',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                cursor: isSpinning ? 'not-allowed' : 'pointer',
                zIndex: 15,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isSpinning ? '...' : 'SPIN!'}
            </motion.button>

            {/* 룰렛 휠 */}
            <motion.div
              animate={{ rotate: rotation }}
              transition={{
                duration: 3,
                ease: [0.2, 0.8, 0.2, 1],
              }}
              style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: '50%',
                overflow: 'hidden',
                boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                border: '6px solid white',
              }}
            >
              <svg width="100%" height="100%" viewBox="0 0 200 200">
                {itemAngles.map(({ item, start, end, color }) => {
                  const textPos = getTextPosition(start, end, 100);
                  const angle = end - start;
                  return (
                    <g key={item.id}>
                      <path
                        d={createSegmentPath(start, end, 100)}
                        fill={color}
                        stroke="white"
                        strokeWidth="1"
                      />
                      {/* 넓이가 충분할 때만 텍스트 표시 */}
                      {angle > 20 && (
                        <text
                          x={textPos.x}
                          y={textPos.y}
                          fill="white"
                          fontSize={angle > 40 ? "11" : "9"}
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${textPos.rotation}, ${textPos.x}, ${textPos.y})`}
                          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                        >
                          {item.name.length > 5 ? item.name.slice(0, 5) + '..' : item.name}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </motion.div>
          </div>

          {/* 범례 */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '0.5rem',
            marginBottom: '1.5rem',
          }}>
            {itemAngles.map(({ item, color }) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.3rem 0.6rem',
                  background: '#f5f5f5',
                  borderRadius: '15px',
                  fontSize: '0.8rem',
                }}
              >
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '3px',
                  background: color,
                }} />
                <span>{item.name}</span>
                <span style={{ color: '#999' }}>
                  ({((item.weight / totalWeight) * 100).toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>

          {/* 결과 표시 */}
          <AnimatePresence>
            {selectedItem && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                style={{
                  padding: '2rem',
                  background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)',
                  borderRadius: 'var(--radius-lg)',
                  textAlign: 'center',
                  color: 'white',
                  boxShadow: 'var(--shadow-float)',
                }}
              >
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                  transition={{ duration: 0.5 }}
                  style={{ fontSize: '3rem', marginBottom: '1rem' }}
                >
                  🎯
                </motion.div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>결과</h2>
                <div style={{
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                }}>
                  {selectedItem.name}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 다시 돌리기 버튼 */}
          {!isSpinning && selectedItem && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={spinWheel}
              style={{
                width: '100%',
                marginTop: '1.5rem',
                padding: '1rem',
                background: 'var(--color-secondary)',
                color: 'var(--color-primary)',
                borderRadius: 'var(--radius-lg)',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                border: '2px solid var(--color-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <Target size={20} />
              다시 돌리기
            </motion.button>
          )}

          {/* 결과 화면 광고 */}
          {selectedItem && !isSpinning && (
            <div style={{ marginTop: '1.5rem' }}>
              <AdBanner size="medium-rectangle" />
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
