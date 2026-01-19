import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Plus, X, Shuffle, ChevronDown, Eye } from 'lucide-react';
import AdBanner from '../../components/ads/AdBanner';

type LadderLine = {
  fromCol: number;
  row: number;
};

type GameState = 'setup' | 'ready' | 'running' | 'finished';

type PathSegment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export default function LadderGame() {
  const [gameState, setGameState] = useState<GameState>('setup');
  const [participants, setParticipants] = useState<string[]>(['철수', '영희', '민수', '지영']);
  const [results, setResults] = useState<string[]>(['당첨!', '꽝', '꽝', '꽝']);
  const [participantInput, setParticipantInput] = useState('');
  const [resultInput, setResultInput] = useState('');
  const [ladderLines, setLadderLines] = useState<LadderLine[]>([]);
  const [animatedPath, setAnimatedPath] = useState<PathSegment[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [finalResults, setFinalResults] = useState<Map<number, number>>(new Map());
  const [animatingColumn, setAnimatingColumn] = useState<number | null>(null);
  const [revealedResults, setRevealedResults] = useState<Set<number>>(new Set());
  const [shuffledResults, setShuffledResults] = useState<string[]>([]);

  const ROWS = 8;
  const COL_WIDTH = 80;
  const ROW_HEIGHT = 50;
  const PADDING = 40;

  const addParticipant = () => {
    if (participantInput.trim() && participants.length < 8) {
      setParticipants([...participants, participantInput.trim()]);
      setParticipantInput('');
    }
  };

  const removeParticipant = (idx: number) => {
    setParticipants(participants.filter((_, i) => i !== idx));
  };

  const addResult = () => {
    if (resultInput.trim() && results.length < participants.length) {
      setResults([...results, resultInput.trim()]);
      setResultInput('');
    }
  };

  const removeResult = (idx: number) => {
    setResults(results.filter((_, i) => i !== idx));
  };

  // 사다리 생성
  const generateLadder = () => {
    if (participants.length < 2) {
      alert('참가자가 2명 이상 필요합니다!');
      return;
    }

    // 결과 개수 맞추기
    let adjustedResults = [...results];
    while (adjustedResults.length < participants.length) {
      adjustedResults.push('꽝');
    }
    adjustedResults = adjustedResults.slice(0, participants.length);

    // 결과 셔플
    const shuffled = [...adjustedResults].sort(() => Math.random() - 0.5);
    setShuffledResults(shuffled);

    // 사다리 가로선 생성
    const lines: LadderLine[] = [];
    const cols = participants.length;

    for (let row = 1; row <= ROWS; row++) {
      for (let col = 0; col < cols - 1; col++) {
        // 각 위치에 35% 확률로 가로선 생성
        if (Math.random() < 0.4) {
          // 바로 왼쪽에 가로선이 없는 경우에만 추가
          const hasLeftLine = lines.some(l => l.row === row && l.fromCol === col - 1);
          if (!hasLeftLine) {
            lines.push({ fromCol: col, row });
          }
        }
      }
    }

    // 최소 연결 보장
    for (let row = 1; row <= ROWS; row++) {
      const hasLine = lines.some(l => l.row === row);
      if (!hasLine && Math.random() < 0.7) {
        const col = Math.floor(Math.random() * (cols - 1));
        lines.push({ fromCol: col, row });
      }
    }

    setLadderLines(lines);
    setFinalResults(new Map());
    setRevealedResults(new Set());
    setAnimatedPath([]);
    setSelectedColumn(null);
    setGameState('ready');
  };

  // SVG 좌표 계산
  const getX = useCallback((col: number) => PADDING + col * COL_WIDTH, []);
  const getY = useCallback((row: number) => PADDING + row * ROW_HEIGHT, []);

  // 사다리 타기 경로 계산
  const calculatePath = useCallback((startCol: number): { segments: PathSegment[], endCol: number } => {
    const segments: PathSegment[] = [];
    let col = startCol;
    let prevX = getX(col);
    let prevY = getY(0);

    for (let row = 1; row <= ROWS + 1; row++) {
      const y = getY(row);

      // 현재 위치에서 가로선 확인 (row - 1 위치)
      const rightLine = ladderLines.find(l => l.row === row && l.fromCol === col);
      const leftLine = ladderLines.find(l => l.row === row && l.fromCol === col - 1);

      if (rightLine) {
        // 가로선 전까지 내려가기
        segments.push({ x1: prevX, y1: prevY, x2: prevX, y2: y });
        // 오른쪽으로 이동
        const newX = getX(col + 1);
        segments.push({ x1: prevX, y1: y, x2: newX, y2: y });
        col++;
        prevX = newX;
        prevY = y;
      } else if (leftLine) {
        // 가로선 전까지 내려가기
        segments.push({ x1: prevX, y1: prevY, x2: prevX, y2: y });
        // 왼쪽으로 이동
        const newX = getX(col - 1);
        segments.push({ x1: prevX, y1: y, x2: newX, y2: y });
        col--;
        prevX = newX;
        prevY = y;
      } else {
        // 그냥 내려가기
        segments.push({ x1: prevX, y1: prevY, x2: prevX, y2: y });
        prevY = y;
      }
    }

    return { segments, endCol: col };
  }, [ladderLines, getX, getY]);

  // 특정 참가자 클릭 시 애니메이션
  const startLadder = async (colIndex: number) => {
    if (animatingColumn !== null) return;
    if (revealedResults.has(colIndex)) return;

    setAnimatingColumn(colIndex);
    setSelectedColumn(colIndex);
    setAnimatedPath([]);

    const { segments, endCol } = calculatePath(colIndex);

    // 애니메이션
    for (let i = 0; i < segments.length; i++) {
      setAnimatedPath(prev => [...prev, segments[i]]);
      await new Promise(resolve => setTimeout(resolve, 120));
    }

    // 결과 저장
    setFinalResults(prev => new Map(prev).set(colIndex, endCol));
    setRevealedResults(prev => new Set(prev).add(colIndex));
    setAnimatingColumn(null);

    // 모든 결과가 공개되었는지 확인
    if (revealedResults.size + 1 === participants.length) {
      setGameState('finished');
    }
  };

  // 전체 공개
  const revealAll = async () => {
    for (let i = 0; i < participants.length; i++) {
      if (!revealedResults.has(i)) {
        await startLadder(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    setGameState('finished');
  };

  const resetGame = () => {
    setGameState('setup');
    setLadderLines([]);
    setAnimatedPath([]);
    setSelectedColumn(null);
    setFinalResults(new Map());
    setRevealedResults(new Set());
    setAnimatingColumn(null);
  };

  const svgWidth = PADDING * 2 + (participants.length - 1) * COL_WIDTH;
  const svgHeight = PADDING * 2 + (ROWS + 1) * ROW_HEIGHT;

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', paddingBottom: '2rem' }}>
      {/* Setup Phase */}
      {gameState === 'setup' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.8rem', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
              사다리 게임 🪜
            </h2>
            <p style={{ color: 'var(--color-text-light)' }}>참가자와 결과를 입력하세요</p>
          </div>

          {/* 참가자 입력 */}
          <div style={{
            marginBottom: '1.5rem',
            padding: '1.5rem',
            background: 'var(--color-white)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <h3 style={{
              marginBottom: '1rem',
              fontSize: '1rem',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span style={{
                width: '24px',
                height: '24px',
                background: 'var(--color-secondary)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 'bold',
              }}>1</span>
              참가자 ({participants.length}/8)
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="text"
                value={participantInput}
                onChange={(e) => setParticipantInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addParticipant()}
                placeholder="이름 입력 후 Enter"
                style={{
                  flex: 1,
                  padding: '0.8rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid #E0E0E0',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
              />
              <button
                onClick={addParticipant}
                disabled={participants.length >= 8}
                style={{
                  padding: '0.8rem 1rem',
                  background: participants.length >= 8 ? '#E0E0E0' : 'var(--color-primary)',
                  color: 'white',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  cursor: participants.length >= 8 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Plus size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', minHeight: '40px' }}>
              {participants.map((p, idx) => (
                <motion.div
                  key={idx}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1rem',
                    background: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)',
                    borderRadius: '25px',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  <span style={{
                    width: '20px',
                    height: '20px',
                    background: 'var(--color-primary)',
                    color: 'white',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                  }}>
                    {idx + 1}
                  </span>
                  {p}
                  <button
                    onClick={() => removeParticipant(idx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      opacity: 0.6,
                    }}
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              ))}
              {participants.length === 0 && (
                <span style={{ color: '#999', fontSize: '0.9rem' }}>참가자를 추가해주세요</span>
              )}
            </div>
          </div>

          {/* 결과 입력 */}
          <div style={{
            marginBottom: '1.5rem',
            padding: '1.5rem',
            background: 'var(--color-white)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <h3 style={{
              marginBottom: '1rem',
              fontSize: '1rem',
              color: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span style={{
                width: '24px',
                height: '24px',
                background: '#FFE5E5',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                color: 'var(--color-accent)',
              }}>2</span>
              결과 ({results.length}/{participants.length})
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="text"
                value={resultInput}
                onChange={(e) => setResultInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addResult()}
                placeholder="예: 당첨!, 커피 사기, 꽝"
                style={{
                  flex: 1,
                  padding: '0.8rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid #E0E0E0',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--color-accent)'}
                onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
              />
              <button
                onClick={addResult}
                disabled={results.length >= participants.length}
                style={{
                  padding: '0.8rem 1rem',
                  background: results.length >= participants.length ? '#E0E0E0' : 'var(--color-accent)',
                  color: 'white',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  cursor: results.length >= participants.length ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Plus size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', minHeight: '40px' }}>
              {results.map((r, idx) => (
                <motion.div
                  key={idx}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1rem',
                    background: r.includes('당첨') || r.includes('사기')
                      ? 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)'
                      : 'linear-gradient(135deg, #F5F5F5 0%, #E0E0E0 100%)',
                    borderRadius: '25px',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  {r.includes('당첨') || r.includes('사기') ? '🎯' : '📌'} {r}
                  <button
                    onClick={() => removeResult(idx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      opacity: 0.6,
                    }}
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              ))}
              {results.length === 0 && (
                <span style={{ color: '#999', fontSize: '0.9rem' }}>결과를 추가해주세요</span>
              )}
            </div>
            <p style={{
              marginTop: '0.8rem',
              fontSize: '0.8rem',
              color: '#999',
              background: '#FAFAFA',
              padding: '0.5rem 0.8rem',
              borderRadius: '8px',
            }}>
              💡 결과가 참가자 수보다 적으면 '꽝'으로 자동 채워집니다
            </p>
          </div>

          <button
            onClick={generateLadder}
            disabled={participants.length < 2}
            style={{
              width: '100%',
              padding: '1.2rem',
              background: participants.length >= 2
                ? 'linear-gradient(135deg, var(--color-primary) 0%, #5DADE2 100%)'
                : '#E0E0E0',
              color: 'white',
              borderRadius: 'var(--radius-lg)',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              border: 'none',
              cursor: participants.length >= 2 ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: participants.length >= 2 ? 'var(--shadow-lg)' : 'none',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => participants.length >= 2 && (e.currentTarget.style.transform = 'scale(1.02)')}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Shuffle size={24} />
            사다리 만들기!
          </button>
        </motion.div>
      )}

      {/* Game Phase */}
      {(gameState === 'ready' || gameState === 'running' || gameState === 'finished') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* 상단 컨트롤 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}>
            <h3 style={{
              color: gameState === 'finished' ? 'var(--color-accent)' : 'var(--color-primary)',
              fontSize: '1.2rem',
            }}>
              {gameState === 'finished' ? '🎉 결과 확인!' : '🪜 참가자를 클릭하세요!'}
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {gameState !== 'finished' && (
                <button
                  onClick={revealAll}
                  disabled={animatingColumn !== null}
                  style={{
                    padding: '0.5rem 1rem',
                    background: animatingColumn !== null ? '#E0E0E0' : '#666',
                    color: 'white',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    border: 'none',
                    cursor: animatingColumn !== null ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  <Eye size={14} /> 전체 공개
                </button>
              )}
              <button
                onClick={resetGame}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'var(--color-text)',
                  color: 'white',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <RotateCcw size={14} /> 다시하기
              </button>
            </div>
          </div>

          {/* 참가자 버튼 */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem',
            flexWrap: 'wrap',
          }}>
            {participants.map((p, idx) => (
              <motion.button
                key={idx}
                onClick={() => startLadder(idx)}
                disabled={revealedResults.has(idx) || animatingColumn !== null}
                whileHover={!revealedResults.has(idx) && animatingColumn === null ? { scale: 1.05, y: -2 } : {}}
                whileTap={!revealedResults.has(idx) && animatingColumn === null ? { scale: 0.95 } : {}}
                style={{
                  width: `${COL_WIDTH - 10}px`,
                  padding: '0.7rem 0.5rem',
                  background: selectedColumn === idx
                    ? 'linear-gradient(135deg, var(--color-primary) 0%, #5DADE2 100%)'
                    : revealedResults.has(idx)
                      ? '#E0E0E0'
                      : 'linear-gradient(135deg, var(--color-secondary) 0%, #D4EFDF 100%)',
                  color: selectedColumn === idx ? 'white' : 'var(--color-text)',
                  borderRadius: '12px',
                  border: selectedColumn === idx ? '3px solid var(--color-primary)' : '3px solid transparent',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  cursor: revealedResults.has(idx) || animatingColumn !== null ? 'default' : 'pointer',
                  opacity: revealedResults.has(idx) ? 0.5 : 1,
                  boxShadow: selectedColumn === idx ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                  transition: 'box-shadow 0.2s',
                }}
              >
                {p}
                {selectedColumn === idx && animatingColumn !== null && (
                  <motion.div
                    animate={{ y: [0, 5, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    style={{ marginTop: '4px' }}
                  >
                    <ChevronDown size={16} />
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>

          {/* SVG 사다리 */}
          <div style={{
            background: 'linear-gradient(180deg, #FAFAFA 0%, #FFFFFF 100%)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-md)',
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            padding: '1rem',
          }}>
            <svg
              width={svgWidth}
              height={svgHeight}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            >
              {/* 배경 그라데이션 */}
              <defs>
                <linearGradient id="ladderGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#8B7355" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#8B7355" stopOpacity="0.2" />
                </linearGradient>
              </defs>

              {/* 세로선 (기둥) */}
              {participants.map((_, idx) => (
                <g key={`v-${idx}`}>
                  {/* 그림자 */}
                  <line
                    x1={getX(idx) + 2}
                    y1={getY(0) + 2}
                    x2={getX(idx) + 2}
                    y2={getY(ROWS + 1) + 2}
                    stroke="rgba(0,0,0,0.1)"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  {/* 기둥 */}
                  <line
                    x1={getX(idx)}
                    y1={getY(0)}
                    x2={getX(idx)}
                    y2={getY(ROWS + 1)}
                    stroke="#8B7355"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                </g>
              ))}

              {/* 가로선 (발판) */}
              {ladderLines.map((line, idx) => (
                <g key={`h-${idx}`}>
                  {/* 그림자 */}
                  <line
                    x1={getX(line.fromCol) + 2}
                    y1={getY(line.row) + 2}
                    x2={getX(line.fromCol + 1) + 2}
                    y2={getY(line.row) + 2}
                    stroke="rgba(0,0,0,0.1)"
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                  {/* 발판 */}
                  <line
                    x1={getX(line.fromCol)}
                    y1={getY(line.row)}
                    x2={getX(line.fromCol + 1)}
                    y2={getY(line.row)}
                    stroke="#A0522D"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                </g>
              ))}

              {/* 애니메이션 경로 */}
              {animatedPath.map((seg, idx) => (
                <motion.line
                  key={idx}
                  x1={seg.x1}
                  y1={seg.y1}
                  x2={seg.x2}
                  y2={seg.y2}
                  stroke="var(--color-accent)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.1 }}
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(231, 76, 60, 0.5))',
                  }}
                />
              ))}

              {/* 현재 위치 마커 */}
              {animatedPath.length > 0 && animatingColumn !== null && (
                <motion.g>
                  {/* 글로우 효과 */}
                  <motion.circle
                    cx={animatedPath[animatedPath.length - 1].x2}
                    cy={animatedPath[animatedPath.length - 1].y2}
                    r="15"
                    fill="var(--color-accent)"
                    opacity="0.3"
                    animate={{ r: [15, 20, 15] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                  {/* 마커 */}
                  <motion.circle
                    cx={animatedPath[animatedPath.length - 1].x2}
                    cy={animatedPath[animatedPath.length - 1].y2}
                    r="10"
                    fill="var(--color-accent)"
                    stroke="white"
                    strokeWidth="3"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.3, repeat: Infinity }}
                  />
                </motion.g>
              )}
            </svg>
          </div>

          {/* 결과 버튼 */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.5rem',
            marginTop: '0.5rem',
            flexWrap: 'wrap',
          }}>
            {shuffledResults.slice(0, participants.length).map((r, idx) => {
              const winnerEntry = Array.from(finalResults.entries()).find(([_, endCol]) => endCol === idx);
              const isRevealed = winnerEntry !== undefined;
              const winnerName = isRevealed ? participants[winnerEntry[0]] : null;
              const isSpecial = r.includes('당첨') || r.includes('사기');

              return (
                <motion.div
                  key={idx}
                  initial={false}
                  animate={{
                    scale: isRevealed ? [1, 1.05, 1] : 1,
                  }}
                  style={{
                    width: `${COL_WIDTH - 10}px`,
                    padding: '0.6rem 0.4rem',
                    borderRadius: '12px',
                    textAlign: 'center',
                    background: isRevealed
                      ? (isSpecial ? 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%)' : 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)')
                      : '#F5F5F5',
                    border: isRevealed
                      ? (isSpecial ? '3px solid var(--color-accent)' : '3px solid #4CAF50')
                      : '3px solid #E0E0E0',
                    boxShadow: isRevealed ? 'var(--shadow-md)' : 'none',
                    transition: 'all 0.3s',
                  }}
                >
                  <div style={{
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    color: isSpecial ? 'var(--color-accent)' : '#666',
                    marginBottom: isRevealed ? '4px' : 0,
                  }}>
                    {isSpecial ? '🎯' : ''} {r}
                  </div>
                  {isRevealed && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-primary)',
                        fontWeight: '500',
                        background: 'rgba(255,255,255,0.8)',
                        borderRadius: '8px',
                        padding: '2px 6px',
                      }}
                    >
                      {winnerName}
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* 결과 요약 */}
          <AnimatePresence>
            {gameState === 'finished' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginTop: '1.5rem',
                  padding: '1.5rem',
                  background: 'var(--color-white)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <h3 style={{
                  marginBottom: '1rem',
                  color: 'var(--color-primary)',
                  textAlign: 'center',
                  fontSize: '1.3rem',
                }}>
                  🎉 최종 결과
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {Array.from(finalResults.entries())
                    .sort((a, b) => a[0] - b[0])
                    .map(([startCol, endCol]) => {
                      const result = shuffledResults[endCol];
                      const isSpecial = result.includes('당첨') || result.includes('사기');
                      return (
                        <motion.div
                          key={startCol}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: startCol * 0.1 }}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '1rem 1.2rem',
                            background: isSpecial
                              ? 'linear-gradient(135deg, #FFF5F5 0%, #FFEBEE 100%)'
                              : 'linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%)',
                            borderRadius: '12px',
                            border: isSpecial ? '2px solid var(--color-accent)' : '2px solid #E0E0E0',
                            boxShadow: isSpecial ? '0 4px 12px rgba(231, 76, 60, 0.15)' : 'none',
                          }}
                        >
                          <span style={{
                            fontWeight: 'bold',
                            fontSize: '1.1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}>
                            <span style={{
                              width: '28px',
                              height: '28px',
                              background: 'var(--color-primary)',
                              color: 'white',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.8rem',
                            }}>
                              {startCol + 1}
                            </span>
                            {participants[startCol]}
                          </span>
                          <span style={{
                            color: isSpecial ? 'var(--color-accent)' : '#666',
                            fontWeight: isSpecial ? 'bold' : 'normal',
                            fontSize: isSpecial ? '1.1rem' : '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}>
                            {isSpecial && '🎯'} {result}
                          </span>
                        </motion.div>
                      );
                    })}
                </div>

                {/* 결과 화면 광고 */}
                <div style={{ marginTop: '1.5rem' }}>
                  <AdBanner size="medium-rectangle" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
