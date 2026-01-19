import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Trophy, Target, Eye } from 'lucide-react';
import AdBanner from '../../components/ads/AdBanner';

type Horse = {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  baseSpeed: number; // 고정된 기본 속도
  currentSpeed: number;
  lane: number;
  finished: boolean;
  finishTime: number | null;
  hitEffect: string | null;
  hitEffectUntil: number; // 장애물 효과 지속시간
  stunUntil: number;
  direction: number;
  lastDirectionChange: number;
};

type Obstacle = {
  id: string;
  x: number;
  lane: number;
  type: 'rock' | 'puddle' | 'wind' | 'banana' | 'bomb' | 'ice' | 'spring' | 'boost' | 'star';
  active: boolean;
};

type GameState = 'setup' | 'countdown' | 'racing' | 'finished';
type WinCondition = 'first' | 'last';

const LANE_COUNT = 5;
const TRACK_WIDTH_PX = 30000;
const FINISH_LINE_PX = TRACK_WIDTH_PX - 200;
const LANE_HEIGHT = 100;
const CAMERA_SWITCH_INTERVAL = 3000; // 3초마다 시점 변경

const HORSE_COLORS = [
  '#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6',
  '#1ABC9C', '#E91E63', '#00BCD4', '#FF5722', '#795548',
  '#607D8B', '#8BC34A', '#FFC107', '#673AB7', '#009688'
];

// 장애물 효과: 일시적으로만 적용됨
const OBSTACLE_TYPES = [
  { type: 'rock' as const, emoji: '🪨', name: '바위', effect: 'slow', multiplier: 0.4, duration: 500 },
  { type: 'puddle' as const, emoji: '💦', name: '웅덩이', effect: 'slow', multiplier: 0.5, duration: 400 },
  { type: 'wind' as const, emoji: '🌪️', name: '회오리', effect: 'pushback', pushback: 150, duration: 0 },
  { type: 'banana' as const, emoji: '🍌', name: '바나나', effect: 'stun', stunDuration: 800, duration: 0 },
  { type: 'bomb' as const, emoji: '💣', name: '폭탄', effect: 'pushback', pushback: 250, duration: 0 },
  { type: 'ice' as const, emoji: '🧊', name: '얼음', effect: 'stun', stunDuration: 600, duration: 0 },
  { type: 'spring' as const, emoji: '🌀', name: '스프링', effect: 'boost', multiplier: 1.8, duration: 600 },
  { type: 'boost' as const, emoji: '⚡', name: '부스터', effect: 'boost', multiplier: 2.2, duration: 800 },
  { type: 'star' as const, emoji: '🌟', name: '스타', effect: 'superboost', multiplier: 3.0, duration: 1000 },
];

export default function RaceGame() {
  const [gameState, setGameState] = useState<GameState>('setup');
  const [input, setInput] = useState('짱구*3\n철수*2\n맹구*2\n훈이');
  const [winCondition, setWinCondition] = useState<WinCondition>('last');
  const [horses, setHorses] = useState<Horse[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [countdown, setCountdown] = useState(3);
  const [winner, setWinner] = useState<Horse | null>(null);
  const [loser, setLoser] = useState<Horse | null>(null);
  const [rankings, setRankings] = useState<Horse[]>([]);
  const [effectText, setEffectText] = useState<{ id: string; text: string; x: number; y: number }[]>([]);
  const [raceProgress, setRaceProgress] = useState(0);
  const [cameraTarget, setCameraTarget] = useState<string | null>(null); // 현재 카메라가 따라가는 말 ID
  const [cameraTargetName, setCameraTargetName] = useState<string>('');
  const [manualScroll, setManualScroll] = useState<number | null>(null); // 미니맵 클릭 시 수동 스크롤 위치

  const animationRef = useRef<number>(undefined);
  const lastTimeRef = useRef<number>(0);
  const obstacleTimerRef = useRef<number>(0);
  const cameraTimerRef = useRef<number>(0);
  const isRacingRef = useRef<boolean>(false);
  const horsesRef = useRef<Horse[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const rankingsRef = useRef<Horse[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<((timestamp: number) => void) | undefined>(undefined);

  const parseInput = useCallback(() => {
    const lines = input.split('\n');
    const result: { name: string; count: number }[] = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let name = trimmed;
      let count = 1;

      if (trimmed.includes('*')) {
        const parts = trimmed.split('*');
        name = parts[0].trim();
        count = parseInt(parts[1]) || 1;
      }

      result.push({ name, count });
    });

    return result;
  }, [input]);

  const initializeGame = () => {
    const parsed = parseInput();
    if (parsed.length === 0) return;

    const newHorses: Horse[] = [];
    let colorIndex = 0;

    // 모든 말의 기본 속도를 비슷하게 (250~290 범위)
    parsed.forEach(({ name, count }) => {
      const color = HORSE_COLORS[colorIndex % HORSE_COLORS.length];
      for (let i = 0; i < count; i++) {
        const baseSpeed = 250 + Math.random() * 40; // 250~290 (편차 줄임)
        newHorses.push({
          id: `horse-${newHorses.length}`,
          name,
          color,
          x: 80 + Math.random() * 40,
          y: 0,
          baseSpeed,
          currentSpeed: baseSpeed,
          lane: newHorses.length % LANE_COUNT,
          finished: false,
          finishTime: null,
          hitEffect: null,
          hitEffectUntil: 0,
          stunUntil: 0,
          direction: 0,
          lastDirectionChange: 0,
        });
      }
      colorIndex++;
    });

    // 레인 분배 최적화
    const lanesUsage = Array(LANE_COUNT).fill(0);
    newHorses.forEach(horse => {
      const minLane = lanesUsage.indexOf(Math.min(...lanesUsage));
      horse.lane = minLane;
      lanesUsage[minLane]++;
    });

    setHorses(newHorses);
    horsesRef.current = newHorses;
    setObstacles([]);
    obstaclesRef.current = [];
    setRankings([]);
    rankingsRef.current = [];
    setWinner(null);
    setLoser(null);
    setCountdown(3);
    setEffectText([]);
    setRaceProgress(0);
    setCameraTarget(newHorses[0]?.id || null);
    setCameraTargetName(newHorses[0]?.name || '');
    setManualScroll(null);
    cameraTimerRef.current = 0;
    setGameState('countdown');
  };

  // 카운트다운
  useEffect(() => {
    if (gameState !== 'countdown') return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      const startTimer = setTimeout(() => {
        setGameState('racing');
        isRacingRef.current = true;
        lastTimeRef.current = performance.now();
        obstacleTimerRef.current = 0;
        cameraTimerRef.current = 0;
        animationRef.current = requestAnimationFrame((t) => gameLoopRef.current?.(t));
      }, 500);
      return () => clearTimeout(startTimer);
    }
  }, [gameState, countdown]);

  // 효과 텍스트 자동 제거
  useEffect(() => {
    if (effectText.length > 0) {
      const timer = setTimeout(() => {
        setEffectText(prev => prev.slice(1));
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [effectText]);

  // 장애물 생성
  const spawnObstacle = useCallback(() => {
    const count = 1 + Math.floor(Math.random() * 2);
    const leadHorse = horsesRef.current.filter(h => !h.finished).sort((a, b) => b.x - a.x)[0];
    const lastHorse = horsesRef.current.filter(h => !h.finished).sort((a, b) => a.x - b.x)[0];

    if (!leadHorse) return;

    for (let i = 0; i < count; i++) {
      const typeInfo = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];

      // 장애물을 선두와 꼴찌 사이에도 배치 (꼴찌에게도 기회를)
      const minX = lastHorse ? lastHorse.x + 200 : leadHorse.x;
      const maxX = leadHorse.x + 1500;

      const newObstacle: Obstacle = {
        id: `obs-${Date.now()}-${Math.random()}`,
        x: minX + Math.random() * (maxX - minX),
        lane: Math.floor(Math.random() * LANE_COUNT),
        type: typeInfo.type,
        active: true,
      };

      if (newObstacle.x < FINISH_LINE_PX - 100) {
        obstaclesRef.current = [...obstaclesRef.current.slice(-40), newObstacle];
      }
    }
    setObstacles([...obstaclesRef.current]);
  }, []);

  // 카메라 타겟 전환
  const switchCameraTarget = useCallback(() => {
    const activeHorses = horsesRef.current.filter(h => !h.finished);
    if (activeHorses.length === 0) return;

    // 다양한 위치의 말들 중에서 랜덤 선택
    const sorted = [...activeHorses].sort((a, b) => b.x - a.x);

    // 가중치: 선두권(40%), 중간권(35%), 후미권(25%)
    const rand = Math.random();
    let targetIndex: number;

    if (rand < 0.4) {
      // 선두권 (상위 30%)
      targetIndex = Math.floor(Math.random() * Math.ceil(sorted.length * 0.3));
    } else if (rand < 0.75) {
      // 중간권 (30~70%)
      const start = Math.ceil(sorted.length * 0.3);
      const end = Math.ceil(sorted.length * 0.7);
      targetIndex = start + Math.floor(Math.random() * (end - start));
    } else {
      // 후미권 (하위 30%)
      const start = Math.ceil(sorted.length * 0.7);
      targetIndex = start + Math.floor(Math.random() * (sorted.length - start));
    }

    targetIndex = Math.min(targetIndex, sorted.length - 1);
    const target = sorted[targetIndex];

    if (target) {
      setCameraTarget(target.id);
      setCameraTargetName(target.name);
      setManualScroll(null); // 수동 스크롤 해제
    }
  }, []);

  // 게임 루프
  const gameLoop = useCallback((timestamp: number) => {
    if (!isRacingRef.current) return;

    const deltaTime = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    // 장애물 생성 (0.3초마다)
    obstacleTimerRef.current += deltaTime * 1000;
    if (obstacleTimerRef.current > 300) {
      spawnObstacle();
      obstacleTimerRef.current = 0;
    }

    // 카메라 전환 (3초마다)
    cameraTimerRef.current += deltaTime * 1000;
    if (cameraTimerRef.current > CAMERA_SWITCH_INTERVAL) {
      switchCameraTarget();
      cameraTimerRef.current = 0;
    }

    const currentObstacles = obstaclesRef.current;
    let newEffects: { id: string; text: string; x: number; y: number }[] = [];

    const updatedHorses = horsesRef.current.map(horse => {
      if (horse.finished) return horse;

      // 스턴 상태 체크
      if (horse.stunUntil > timestamp) {
        return { ...horse, hitEffect: 'stun', currentSpeed: 0 };
      }

      // 기본 속도에 랜덤 요소 추가 (±15%)
      const randomFactor = 0.85 + Math.random() * 0.3;
      let currentSpeed = horse.baseSpeed * randomFactor;

      // 장애물 효과가 활성화된 경우 (일시적)
      let hitEffect = horse.hitEffect;
      let hitEffectUntil = horse.hitEffectUntil;

      if (hitEffectUntil > timestamp) {
        // 효과 지속 중
        const activeType = OBSTACLE_TYPES.find(t => t.type === hitEffect);
        if (activeType && 'multiplier' in activeType && activeType.multiplier !== undefined) {
          currentSpeed *= activeType.multiplier;
        }
      } else {
        // 효과 종료
        hitEffect = null;
        hitEffectUntil = 0;
      }

      // 방향 전환 (지그재그) - 1초마다
      let newDirection = horse.direction;
      let newY = horse.y;

      if (timestamp - horse.lastDirectionChange > 1000) {
        newDirection = Math.floor(Math.random() * 3) - 1;
        horse.lastDirectionChange = timestamp;
      }

      newY += newDirection * 25 * deltaTime;
      newY = Math.max(-20, Math.min(20, newY));

      let pushback = 0;
      let stunUntil = horse.stunUntil;

      // 장애물 충돌 체크
      currentObstacles.forEach(obs => {
        if (!obs.active) return;
        if (obs.lane !== horse.lane) return;

        const dist = Math.abs(obs.x - horse.x);
        if (dist < 50) {
          const typeInfo = OBSTACLE_TYPES.find(t => t.type === obs.type);
          if (!typeInfo) return;

          if (typeInfo.effect === 'slow' || typeInfo.effect === 'boost' || typeInfo.effect === 'superboost') {
            // 일시적 효과 적용
            hitEffect = obs.type;
            hitEffectUntil = timestamp + typeInfo.duration;

            const effectName = typeInfo.effect === 'slow' ? '감속!' :
                             typeInfo.effect === 'superboost' ? '슈퍼 부스트!!' : '부스트!';
            newEffects.push({
              id: `eff-${Date.now()}-${Math.random()}`,
              text: `${typeInfo.emoji} ${effectName}`,
              x: horse.x,
              y: horse.lane * LANE_HEIGHT + 50,
            });
          } else if (typeInfo.effect === 'pushback' && 'pushback' in typeInfo && typeInfo.pushback !== undefined) {
            pushback = typeInfo.pushback;
            newEffects.push({
              id: `eff-${Date.now()}-${Math.random()}`,
              text: `${typeInfo.emoji} ${typeInfo.name}!`,
              x: horse.x,
              y: horse.lane * LANE_HEIGHT + 50,
            });
          } else if (typeInfo.effect === 'stun' && 'stunDuration' in typeInfo && typeInfo.stunDuration !== undefined) {
            stunUntil = timestamp + typeInfo.stunDuration;
            newEffects.push({
              id: `eff-${Date.now()}-${Math.random()}`,
              text: `${typeInfo.emoji} ${typeInfo.name}!`,
              x: horse.x,
              y: horse.lane * LANE_HEIGHT + 50,
            });
          }

          obs.active = false;
        }
      });

      // 위치 계산
      let newX = horse.x + currentSpeed * deltaTime - pushback;
      newX = Math.max(80, newX);

      // 도착 체크
      if (newX >= FINISH_LINE_PX) {
        rankingsRef.current = [...rankingsRef.current, { ...horse, x: FINISH_LINE_PX, finished: true, finishTime: timestamp }];
        return {
          ...horse,
          x: FINISH_LINE_PX,
          y: 0,
          finished: true,
          finishTime: timestamp,
          hitEffect: null,
          hitEffectUntil: 0,
          stunUntil: 0,
          currentSpeed: 0,
        };
      }

      return {
        ...horse,
        x: newX,
        y: newY,
        currentSpeed,
        hitEffect,
        hitEffectUntil,
        stunUntil,
        direction: newDirection,
      };
    });

    horsesRef.current = updatedHorses;
    setHorses([...updatedHorses]);
    setRankings([...rankingsRef.current]);

    // 진행률 업데이트
    const leadX = Math.max(...updatedHorses.map(h => h.x));
    setRaceProgress((leadX / FINISH_LINE_PX) * 100);

    if (newEffects.length > 0) {
      setEffectText(prev => [...prev, ...newEffects].slice(-8));
    }

    // 게임 종료 체크
    if (updatedHorses.every(h => h.finished)) {
      isRacingRef.current = false;
      setGameState('finished');
      setWinner(rankingsRef.current[0] || null);
      setLoser(rankingsRef.current[rankingsRef.current.length - 1] || null);
      return;
    }

    animationRef.current = requestAnimationFrame((t) => gameLoopRef.current?.(t));
  }, [spawnObstacle, switchCameraTarget]);

  // gameLoopRef를 항상 최신 gameLoop으로 유지
  useEffect(() => {
    gameLoopRef.current = gameLoop;
  }, [gameLoop]);

  // 클린업
  useEffect(() => {
    return () => {
      isRacingRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // 스크롤 업데이트 (카메라 타겟 또는 수동 스크롤)
  useEffect(() => {
    if ((gameState === 'racing' || gameState === 'finished') && trackRef.current && horses.length > 0) {
      if (manualScroll !== null) {
        // 미니맵 클릭으로 수동 스크롤
        trackRef.current.scrollLeft = manualScroll;
      } else if (cameraTarget) {
        // 카메라 타겟 따라가기
        const targetHorse = horses.find(h => h.id === cameraTarget);
        if (targetHorse && !targetHorse.finished) {
          const scrollTarget = Math.max(0, targetHorse.x - 400);
          trackRef.current.scrollLeft = scrollTarget;
        } else {
          // 타겟이 완주했으면 다음 말로 전환
          const activeHorse = horses.find(h => !h.finished);
          if (activeHorse) {
            setCameraTarget(activeHorse.id);
            setCameraTargetName(activeHorse.name);
          }
        }
      }
    }
  }, [horses, gameState, cameraTarget, manualScroll]);

  // 미니맵 클릭/드래그 핸들러
  const handleMinimapInteraction = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!minimapRef.current) return;

    const rect = minimapRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const scrollPosition = percentage * TRACK_WIDTH_PX - 400;

    setManualScroll(Math.max(0, Math.min(scrollPosition, TRACK_WIDTH_PX - 800)));
  };

  // 미니맵에서 마우스 떠나면 자동 카메라로 복귀
  const handleMinimapLeave = () => {
    // 2초 후 자동 카메라로 복귀
    setTimeout(() => {
      if (isRacingRef.current) {
        setManualScroll(null);
      }
    }, 2000);
  };

  // 특정 말 클릭해서 따라가기
  const focusOnHorse = (horseId: string, horseName: string) => {
    setCameraTarget(horseId);
    setCameraTargetName(horseName);
    setManualScroll(null);
    cameraTimerRef.current = 0; // 타이머 리셋
  };

  const resetGame = () => {
    isRacingRef.current = false;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setGameState('setup');
    setHorses([]);
    horsesRef.current = [];
    setObstacles([]);
    obstaclesRef.current = [];
    setRankings([]);
    rankingsRef.current = [];
    setWinner(null);
    setLoser(null);
    setEffectText([]);
    obstacleTimerRef.current = 0;
    cameraTimerRef.current = 0;
    setRaceProgress(0);
    setCameraTarget(null);
    setManualScroll(null);
  };

  const getObstacleEmoji = (type: string) => {
    return OBSTACLE_TYPES.find(t => t.type === type)?.emoji || '🪨';
  };

  const targetHorse = winCondition === 'first' ? winner : loser;

  return (
    <div style={{ width: '100%', paddingBottom: '2rem' }}>
      {/* Setup Phase */}
      {gameState === 'setup' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ maxWidth: '500px', margin: '0 auto' }}
        >
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.8rem', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
              끝까지 가야대! 🏇
            </h2>
            <p style={{ color: 'var(--color-text-light)' }}>참가자를 입력하세요 (이름*수량)</p>
          </div>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{
              width: '100%',
              height: '180px',
              padding: '1rem',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid rgba(0,0,0,0.1)',
              fontSize: '1.1rem',
              fontFamily: 'var(--font-body)',
              marginBottom: '1rem',
              resize: 'none',
              outline: 'none',
              background: 'var(--color-white)',
              boxSizing: 'border-box',
            }}
            placeholder="예시:&#10;짱구*3&#10;철수*2&#10;맹구"
          />

          <div style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}>
            <button
              onClick={() => setWinCondition('first')}
              style={{
                flex: 1,
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                border: winCondition === 'first' ? '2px solid var(--color-primary)' : '2px solid #ddd',
                background: winCondition === 'first' ? 'var(--color-secondary)' : 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <Trophy size={20} />
              1등이 당첨
            </button>
            <button
              onClick={() => setWinCondition('last')}
              style={{
                flex: 1,
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                border: winCondition === 'last' ? '2px solid var(--color-accent)' : '2px solid #ddd',
                background: winCondition === 'last' ? '#FFE5E5' : 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <Target size={20} />
              꼴등이 당첨
            </button>
          </div>

          <button
            onClick={initializeGame}
            style={{
              width: '100%',
              padding: '1rem',
              background: 'var(--color-primary)',
              color: 'white',
              borderRadius: 'var(--radius-lg)',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: 'var(--shadow-lg)',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            <Play size={24} />
            경주 시작!
          </button>

          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'rgba(0,0,0,0.03)',
            borderRadius: 'var(--radius-md)',
          }}>
            <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-light)' }}>
              장애물 효과 (일시적!)
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8rem' }}>
              {OBSTACLE_TYPES.map(obs => (
                <span key={obs.type} style={{
                  padding: '4px 8px',
                  background: 'white',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  {obs.emoji} {obs.name}
                  <span style={{
                    color: obs.effect === 'boost' || obs.effect === 'superboost' ? '#2ECC71' : '#E74C3C',
                    fontSize: '0.7rem'
                  }}>
                    ({obs.effect === 'slow' ? '감속' : obs.effect === 'pushback' ? '밀림' : obs.effect === 'stun' ? '기절' : obs.effect === 'superboost' ? '초가속' : '가속'})
                  </span>
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Countdown */}
      <AnimatePresence>
        {gameState === 'countdown' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.8)',
              zIndex: 1000,
            }}
          >
            <motion.div
              key={countdown}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              style={{
                fontSize: countdown === 0 ? '5rem' : '10rem',
                fontWeight: 'bold',
                color: countdown === 0 ? '#2ECC71' : countdown === 1 ? '#E74C3C' : countdown === 2 ? '#F39C12' : '#3498DB',
                textShadow: '0 0 50px rgba(255,255,255,0.5)',
              }}
            >
              {countdown === 0 ? 'GO!' : countdown}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Racing Phase */}
      {(gameState === 'racing' || gameState === 'finished') && (
        <div>
          {/* 상단 컨트롤 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem',
            padding: '0 0.5rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{
                color: gameState === 'finished' ? 'var(--color-accent)' : 'var(--color-primary)',
                fontSize: '1.2rem',
              }}>
                {gameState === 'finished' ? '🏁 경주 종료!' : '🏇 달려라~!'}
              </h3>
              {gameState === 'racing' && cameraTargetName && (
                <motion.span
                  key={cameraTargetName}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    padding: '4px 10px',
                    background: 'var(--color-secondary)',
                    borderRadius: '15px',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Eye size={14} />
                  {cameraTargetName} 시점
                </motion.span>
              )}
            </div>
            <button
              onClick={resetGame}
              style={{
                padding: '0.5rem 1rem',
                background: 'var(--color-text)',
                color: 'white',
                borderRadius: '20px',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={16} /> 다시하기
            </button>
          </div>

          {/* 진행률 바 */}
          <div style={{
            marginBottom: '0.5rem',
            padding: '0 0.5rem',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
              color: 'var(--color-text-light)',
              marginBottom: '4px',
            }}>
              <span>START</span>
              <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
                {Math.round(raceProgress)}%
              </span>
              <span>FINISH</span>
            </div>
            <div style={{
              height: '8px',
              background: '#E0E0E0',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <motion.div
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--color-primary) 0%, #2ECC71 100%)',
                  borderRadius: '4px',
                }}
                animate={{ width: `${raceProgress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>

          {/* 트랙 컨테이너 */}
          <div
            ref={trackRef}
            style={{
              width: '100%',
              overflowX: 'auto',
              overflowY: 'hidden',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              scrollBehavior: 'smooth',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: `${TRACK_WIDTH_PX}px`,
                height: `${LANE_COUNT * LANE_HEIGHT + 60}px`,
                background: 'linear-gradient(180deg, #6B8E23 0%, #556B2F 50%, #6B8E23 100%)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              {/* 잔디 텍스처 */}
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `
                  repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255,255,255,0.02) 50px, rgba(255,255,255,0.02) 100px),
                  repeating-linear-gradient(0deg, transparent, transparent 25px, rgba(0,0,0,0.03) 25px, rgba(0,0,0,0.03) 50px)
                `,
                pointerEvents: 'none',
              }} />

              {/* 레인들 */}
              {Array.from({ length: LANE_COUNT }).map((_, laneIdx) => (
                <div
                  key={laneIdx}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: `${laneIdx * LANE_HEIGHT + 30}px`,
                    height: `${LANE_HEIGHT}px`,
                    borderBottom: laneIdx < LANE_COUNT - 1 ? '3px solid rgba(255,255,255,0.2)' : 'none',
                    background: laneIdx % 2 === 0 ? 'rgba(0,0,0,0.05)' : 'transparent',
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    left: '15px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                  }}>
                    {laneIdx + 1}
                  </div>
                </div>
              ))}

              {/* 시작선 */}
              <div style={{
                position: 'absolute',
                left: '100px',
                top: '30px',
                bottom: '30px',
                width: '5px',
                background: 'white',
                boxShadow: '0 0 10px rgba(255,255,255,0.5)',
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-25px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                }}>
                  🚦 START
                </div>
              </div>

              {/* 거리 표시 마커 */}
              {Array.from({ length: Math.floor(TRACK_WIDTH_PX / 1000) }).map((_, i) => {
                const pos = (i + 1) * 1000;
                return (
                  <div
                    key={pos}
                    style={{
                      position: 'absolute',
                      left: `${pos}px`,
                      top: '0',
                      bottom: '0',
                      width: i % 5 === 4 ? '2px' : '1px',
                      background: i % 5 === 4 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    {i % 5 === 4 && (
                      <div style={{
                        position: 'absolute',
                        top: '5px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                      }}>
                        {pos / 1000}km
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 결승선 */}
              <div style={{
                position: 'absolute',
                left: `${FINISH_LINE_PX}px`,
                top: '30px',
                bottom: '30px',
                width: '20px',
                background: 'repeating-linear-gradient(0deg, #000 0px, #000 20px, #fff 20px, #fff 40px)',
                boxShadow: '0 0 30px rgba(0,0,0,0.5), 0 0 60px rgba(255,255,255,0.3)',
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-25px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                }}>
                  🏁 FINISH
                </div>
              </div>

              {/* 장애물들 */}
              <AnimatePresence>
                {obstacles.filter(o => o.active).map(obs => (
                  <motion.div
                    key={obs.id}
                    initial={{ scale: 0, rotate: 360 }}
                    animate={{
                      scale: [1, 1.15, 1],
                      rotate: [0, 5, -5, 0],
                    }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{
                      scale: { duration: 0.4, repeat: Infinity },
                      rotate: { duration: 0.25, repeat: Infinity },
                    }}
                    style={{
                      position: 'absolute',
                      left: `${obs.x}px`,
                      top: `${obs.lane * LANE_HEIGHT + 60}px`,
                      fontSize: '2.8rem',
                      transform: 'translate(-50%, -50%)',
                      filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
                      zIndex: 5,
                    }}
                  >
                    {getObstacleEmoji(obs.type)}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* 효과 텍스트 */}
              <AnimatePresence>
                {effectText.map(eff => (
                  <motion.div
                    key={eff.id}
                    initial={{ opacity: 1, y: 0, scale: 0.5 }}
                    animate={{ opacity: 0, y: -60, scale: 1.8 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    style={{
                      position: 'absolute',
                      left: `${eff.x}px`,
                      top: `${eff.y}px`,
                      color: 'white',
                      fontSize: '1.3rem',
                      fontWeight: 'bold',
                      textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                      zIndex: 20,
                      pointerEvents: 'none',
                    }}
                  >
                    {eff.text}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* 말들 */}
              {horses.map((horse) => {
                const isBoost = horse.hitEffect === 'spring' || horse.hitEffect === 'boost' || horse.hitEffect === 'star';
                const isSlow = horse.hitEffect === 'rock' || horse.hitEffect === 'puddle';

                return (
                  <motion.div
                    key={horse.id}
                    animate={{
                      left: horse.x,
                      top: horse.lane * LANE_HEIGHT + 55 + horse.y,
                      scale: horse.hitEffect && !isBoost && !isSlow ? [1, 0.7, 1] : 1,
                    }}
                    transition={{
                      left: { duration: 0.03, ease: 'linear' },
                      top: { duration: 0.15, ease: 'easeOut' },
                      scale: { duration: 0.3 },
                    }}
                    style={{
                      position: 'absolute',
                      left: horse.x,
                      top: horse.lane * LANE_HEIGHT + 55 + horse.y,
                      zIndex: cameraTarget === horse.id ? 15 : 10,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <div style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}>
                      {/* 카메라 표시 */}
                      {cameraTarget === horse.id && gameState === 'racing' && (
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                          style={{
                            position: 'absolute',
                            top: '-40px',
                            fontSize: '1.2rem',
                          }}
                        >
                          📹
                        </motion.div>
                      )}

                      {/* 이름표 */}
                      <div style={{
                        background: horse.color,
                        color: 'white',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                        marginBottom: '3px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                        border: cameraTarget === horse.id ? '2px solid white' : 'none',
                      }}>
                        {horse.name}
                      </div>

                      {/* 말 이모지 */}
                      <motion.div
                        animate={!horse.finished && horse.hitEffect !== 'stun' ? {
                          y: [0, -6, 0],
                          rotate: [horse.direction * -5, horse.direction * 5, horse.direction * -5],
                        } : horse.hitEffect === 'stun' ? {
                          rotate: [0, 25, -25, 0],
                        } : {}}
                        transition={{
                          duration: horse.hitEffect === 'stun' ? 0.25 : isBoost ? 0.08 : 0.12,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        style={{
                          fontSize: '3.2rem',
                          filter: horse.finished ? 'none' :
                                  isBoost ? 'drop-shadow(0 0 10px #FFD700) brightness(1.2)' :
                                  isSlow ? 'grayscale(0.5)' :
                                  'drop-shadow(3px 3px 5px rgba(0,0,0,0.3))',
                        }}
                      >
                        {horse.hitEffect === 'stun' ? '😵' : isBoost ? '🔥' : '🏇'}
                      </motion.div>

                      {/* 먼지/불꽃 효과 */}
                      {!horse.finished && horse.hitEffect !== 'stun' && (
                        <motion.div
                          animate={{ opacity: [0.6, 0], x: [-15, -50], scale: [0.5, 1.8] }}
                          transition={{ duration: isBoost ? 0.15 : 0.3, repeat: Infinity }}
                          style={{
                            position: 'absolute',
                            left: '-25px',
                            bottom: '10px',
                            fontSize: '1.4rem',
                          }}
                        >
                          {isBoost ? '⚡' : '💨'}
                        </motion.div>
                      )}

                      {/* 도착 순위 */}
                      {horse.finished && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 200 }}
                          style={{
                            position: 'absolute',
                            right: '-25px',
                            top: '25px',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: rankings.indexOf(horse) === 0 ? '#FFD700' :
                              rankings.indexOf(horse) === 1 ? '#C0C0C0' :
                                rankings.indexOf(horse) === 2 ? '#CD7F32' : '#666',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            boxShadow: '0 3px 8px rgba(0,0,0,0.4)',
                          }}
                        >
                          {rankings.indexOf(horse) + 1}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* 미니맵 (클릭 가능) */}
          <div style={{
            marginTop: '1rem',
            padding: '0.5rem',
            background: 'rgba(0,0,0,0.1)',
            borderRadius: 'var(--radius-md)',
          }}>
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-light)',
              marginBottom: '4px',
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>🗺️ 미니맵 (클릭하여 이동)</span>
              {manualScroll !== null && (
                <span style={{ color: 'var(--color-accent)' }}>수동 시점</span>
              )}
            </div>
            <div
              ref={minimapRef}
              onClick={handleMinimapInteraction}
              onMouseMove={(e) => e.buttons === 1 && handleMinimapInteraction(e)}
              onMouseLeave={handleMinimapLeave}
              style={{
                position: 'relative',
                height: '50px',
                background: 'linear-gradient(90deg, #556B2F 0%, #6B8E23 50%, #556B2F 100%)',
                borderRadius: '8px',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
            >
              {/* 결승선 미니 */}
              <div style={{
                position: 'absolute',
                right: `${(1 - FINISH_LINE_PX / TRACK_WIDTH_PX) * 100}%`,
                top: 0,
                bottom: 0,
                width: '4px',
                background: 'repeating-linear-gradient(0deg, #000 0px, #000 5px, #fff 5px, #fff 10px)',
              }} />

              {/* 현재 뷰포트 표시 */}
              {trackRef.current && (
                <div style={{
                  position: 'absolute',
                  left: `${(trackRef.current.scrollLeft / TRACK_WIDTH_PX) * 100}%`,
                  top: 0,
                  bottom: 0,
                  width: `${(trackRef.current.clientWidth / TRACK_WIDTH_PX) * 100}%`,
                  background: 'rgba(255,255,255,0.2)',
                  border: '2px solid rgba(255,255,255,0.5)',
                  borderRadius: '4px',
                  pointerEvents: 'none',
                }} />
              )}

              {/* 말들 미니 */}
              {horses.map(horse => (
                <motion.div
                  key={horse.id}
                  animate={{ left: `${(horse.x / TRACK_WIDTH_PX) * 100}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    focusOnHorse(horse.id, horse.name);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${(horse.x / TRACK_WIDTH_PX) * 100}%`,
                    top: `${horse.lane * 9 + 4}px`,
                    width: cameraTarget === horse.id ? '14px' : '10px',
                    height: cameraTarget === horse.id ? '14px' : '10px',
                    borderRadius: '50%',
                    background: horse.color,
                    transform: 'translateX(-50%)',
                    boxShadow: cameraTarget === horse.id ? '0 0 10px white' : '0 0 6px rgba(0,0,0,0.5)',
                    border: cameraTarget === horse.id ? '2px solid white' : '1px solid white',
                    cursor: 'pointer',
                    zIndex: cameraTarget === horse.id ? 10 : 1,
                  }}
                  title={`${horse.name} 시점으로 전환`}
                />
              ))}
            </div>
          </div>

          {/* 실시간 순위 (클릭하여 시점 변경) */}
          {gameState === 'racing' && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: 'var(--color-white)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)', fontSize: '0.9rem' }}>
                🔥 실시간 순위 (클릭하여 시점 변경)
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {[...horses]
                  .sort((a, b) => b.x - a.x)
                  .map((horse, idx) => (
                    <motion.div
                      key={horse.id}
                      onClick={() => focusOnHorse(horse.id, horse.name)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.4rem 0.7rem',
                        background: cameraTarget === horse.id ? 'var(--color-primary)' :
                                   idx === 0 ? '#FFF9E6' : '#F5F5F5',
                        color: cameraTarget === horse.id ? 'white' : 'inherit',
                        borderRadius: '15px',
                        fontSize: '0.8rem',
                        border: idx === 0 && cameraTarget !== horse.id ? '2px solid #FFD700' :
                               cameraTarget === horse.id ? '2px solid var(--color-primary)' : 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{
                        fontWeight: 'bold',
                        color: cameraTarget === horse.id ? 'white' : idx === 0 ? '#FFD700' : '#666',
                      }}>
                        {idx + 1}
                      </span>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: horse.color,
                      }} />
                      <span>{horse.name}</span>
                      {cameraTarget === horse.id && <Eye size={12} />}
                    </motion.div>
                  ))}
              </div>
            </div>
          )}

          {/* 결과 */}
          <AnimatePresence>
            {gameState === 'finished' && targetHorse && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginTop: '2rem',
                  padding: '2rem',
                  background: winCondition === 'first' ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' : 'linear-gradient(135deg, #FF6B6B 0%, #EE5A5A 100%)',
                  borderRadius: 'var(--radius-lg)',
                  textAlign: 'center',
                  color: 'white',
                  boxShadow: 'var(--shadow-float)',
                }}
              >
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: 3 }}
                  style={{ fontSize: '4rem', marginBottom: '1rem' }}
                >
                  {winCondition === 'first' ? '🏆' : '☕'}
                </motion.div>
                <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>
                  {winCondition === 'first' ? '우승자' : '오늘의 주인공'}
                </h2>
                <div style={{
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                }}>
                  {targetHorse.name}
                </div>
                <p style={{ marginTop: '1rem', opacity: 0.9 }}>
                  {winCondition === 'last' ? '오늘 커피는 이 분이 쏩니다! 🎉' : '축하합니다! 🎉'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 전체 순위 */}
          {gameState === 'finished' && rankings.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{
                marginTop: '1.5rem',
                padding: '1.5rem',
                background: 'var(--color-white)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>📊 전체 순위</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {rankings.map((horse, idx) => (
                  <div
                    key={horse.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.5rem 1rem',
                      background: idx === 0 ? '#FFF9E6' :
                        idx === rankings.length - 1 ? '#FFE5E5' : '#f5f5f5',
                      borderRadius: '8px',
                      border: (winCondition === 'first' && idx === 0) || (winCondition === 'last' && idx === rankings.length - 1)
                        ? '2px solid var(--color-primary)' : 'none',
                    }}
                  >
                    <span style={{
                      width: '40px',
                      fontWeight: 'bold',
                      color: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : '#666',
                    }}>
                      {idx + 1}위
                    </span>
                    <span style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: horse.color,
                      marginRight: '10px',
                    }} />
                    <span style={{ fontWeight: idx === 0 || idx === rankings.length - 1 ? 'bold' : 'normal' }}>
                      {horse.name}
                    </span>
                    {((winCondition === 'first' && idx === 0) || (winCondition === 'last' && idx === rankings.length - 1)) && (
                      <span style={{ marginLeft: 'auto', fontSize: '0.9rem' }}>
                        {winCondition === 'first' ? '🏆 우승!' : '☕ 커피 당첨!'}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* 결과 화면 광고 */}
              <div style={{ marginTop: '1.5rem' }}>
                <AdBanner size="medium-rectangle" />
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
