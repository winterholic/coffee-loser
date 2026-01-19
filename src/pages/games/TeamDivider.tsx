import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shuffle, RotateCcw, Check, ChevronRight } from 'lucide-react';
import AdBanner from '../../components/ads/AdBanner';

type Member = {
  id: string;
  name: string;
  team: 'A' | 'B';
  row: number;
};

type Step = 'count' | 'names' | 'result';

export default function TeamDivider() {
  const [step, setStep] = useState<Step>('count');
  const [peopleCount, setPeopleCount] = useState(10);
  const [names, setNames] = useState<string[]>([]);
  const [shuffleAll, setShuffleAll] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [isShuffling, setIsShuffling] = useState(false);

  // Step 1: 인원수 확정 후 이름 입력 칸 생성
  const goToNames = () => {
    if (peopleCount < 2) return;
    setNames(Array(peopleCount).fill('').map((_, i) => `참가자${i + 1}`));
    setStep('names');
  };

  // 이름 변경
  const updateName = (idx: number, value: string) => {
    const newNames = [...names];
    newNames[idx] = value;
    setNames(newNames);
  };

  // Step 2: 팀 나누기 시작
  const startDivide = () => {
    const validNames = names.map((n, i) => n.trim() || `참가자${i + 1}`);

    // 멤버 초기화 - 처음엔 입력 순서대로 A/B 배정
    const initialMembers: Member[] = validNames.map((name, idx) => ({
      id: `member-${idx}`,
      name,
      team: idx % 2 === 0 ? 'A' : 'B',
      row: Math.floor(idx / 2),
    }));

    setMembers(initialMembers);
    setStep('result');

    // 자동 셔플
    setTimeout(() => shuffleTeams(initialMembers), 500);
  };

  const shuffleTeams = async (currentMembers?: Member[]) => {
    setIsShuffling(true);

    // 셔플 애니메이션
    for (let i = 0; i < 8; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));

      setMembers(prev => {
        const updated = [...(currentMembers || prev)];

        if (shuffleAll) {
          // 전부 섞기
          updated.sort(() => Math.random() - 0.5);
          const half = Math.ceil(updated.length / 2);
          updated.forEach((m, idx) => {
            m.team = idx < half ? 'A' : 'B';
          });
        } else {
          // 같은 줄끼리만 섞기
          const rows = new Map<number, Member[]>();
          updated.forEach(m => {
            if (!rows.has(m.row)) rows.set(m.row, []);
            rows.get(m.row)!.push(m);
          });

          rows.forEach(rowMembers => {
            if (rowMembers.length === 2 && Math.random() > 0.5) {
              const temp = rowMembers[0].team;
              rowMembers[0].team = rowMembers[1].team;
              rowMembers[1].team = temp;
            }
          });
        }

        return updated;
      });
    }

    setIsShuffling(false);
  };

  const resetGame = () => {
    setStep('count');
    setMembers([]);
    setNames([]);
  };

  const teamA = members.filter(m => m.team === 'A');
  const teamB = members.filter(m => m.team === 'B');

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '2rem' }}>
      {/* Step 1: 인원수 입력 */}
      {step === 'count' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Users size={48} color="var(--color-primary)" style={{ marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.8rem', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
              팀 나누기
            </h2>
            <p style={{ color: 'var(--color-text-light)' }}>참가 인원을 선택하세요</p>
          </div>

          {/* 인원수 선택 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}>
            <button
              onClick={() => setPeopleCount(Math.max(2, peopleCount - 1))}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                border: '2px solid #ddd',
                background: 'white',
                fontSize: '2rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              -
            </button>
            <div style={{
              fontSize: '4rem',
              fontWeight: 'bold',
              color: 'var(--color-primary)',
              minWidth: '100px',
              textAlign: 'center',
            }}>
              {peopleCount}
            </div>
            <button
              onClick={() => setPeopleCount(Math.min(20, peopleCount + 1))}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                border: '2px solid #ddd',
                background: 'white',
                fontSize: '2rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              +
            </button>
          </div>

          <p style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--color-text-light)' }}>
            A팀 {Math.ceil(peopleCount / 2)}명 vs B팀 {Math.floor(peopleCount / 2)}명
          </p>

          <button
            onClick={goToNames}
            style={{
              width: '100%',
              padding: '1rem',
              background: 'var(--color-primary)',
              color: 'white',
              borderRadius: 'var(--radius-lg)',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            다음 <ChevronRight size={20} />
          </button>
        </motion.div>
      )}

      {/* Step 2: 이름 입력 */}
      {step === 'names' && (
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
              참가자 이름 입력
            </h2>
            <p style={{ color: 'var(--color-text-light)' }}>{peopleCount}명의 이름을 입력하세요</p>
          </div>

          {/* 이름 입력 그리드 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.8rem',
            marginBottom: '1.5rem',
          }}>
            {names.map((name, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <span style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: idx % 2 === 0 ? '#2196F3' : '#E91E63',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    flexShrink: 0,
                  }}>
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => updateName(idx, e.target.value)}
                    placeholder={`참가자${idx + 1}`}
                    style={{
                      flex: 1,
                      padding: '0.8rem',
                      borderRadius: 'var(--radius-lg)',
                      border: '2px solid #eee',
                      fontSize: '0.95rem',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={(e) => e.target.style.borderColor = '#eee'}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          {/* 섞기 옵션 */}
          <div
            onClick={() => setShuffleAll(!shuffleAll)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.8rem',
              padding: '1rem',
              background: shuffleAll ? 'var(--color-secondary)' : '#f5f5f5',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '1.5rem',
              cursor: 'pointer',
              border: shuffleAll ? '2px solid var(--color-primary)' : '2px solid transparent',
            }}
          >
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              border: '2px solid',
              borderColor: shuffleAll ? 'var(--color-primary)' : '#ccc',
              background: shuffleAll ? 'var(--color-primary)' : 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {shuffleAll && <Check size={16} color="white" />}
            </div>
            <div>
              <div style={{ fontWeight: 'bold' }}>전부 섞기</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-light)' }}>
                {shuffleAll ? '전원이 무작위로 팀에 배정' : '같은 줄끼리만 좌우 교환'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setStep('count')}
              style={{
                flex: 1,
                padding: '1rem',
                background: '#f0f0f0',
                color: 'var(--color-text)',
                borderRadius: 'var(--radius-lg)',
                fontSize: '1rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              이전
            </button>
            <button
              onClick={startDivide}
              style={{
                flex: 2,
                padding: '1rem',
                background: 'var(--color-primary)',
                color: 'white',
                borderRadius: 'var(--radius-lg)',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <Shuffle size={20} />
              팀 나누기!
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 3: 결과 */}
      {step === 'result' && (
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
              {isShuffling ? '🔀 섞는 중...' : '⚔️ 팀 완성!'}
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => shuffleTeams()}
                disabled={isShuffling}
                style={{
                  padding: '0.5rem 1rem',
                  background: isShuffling ? '#ccc' : 'var(--color-accent)',
                  color: 'white',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  border: 'none',
                  cursor: isShuffling ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <Shuffle size={16} /> 다시 섞기
              </button>
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
          </div>

          {/* 팀 표시 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            position: 'relative',
          }}>
            {/* VS 배지 */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                zIndex: 10,
              }}
            >
              VS
            </motion.div>

            {/* A팀 */}
            <motion.div
              layout
              style={{
                background: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#2196F3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                }}>
                  A
                </div>
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1565C0' }}>
                  {teamA.length}명
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <AnimatePresence mode="popLayout">
                  {teamA.map((member) => (
                    <motion.div
                      key={member.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      style={{
                        padding: '0.8rem 1rem',
                        background: 'white',
                        borderRadius: '10px',
                        textAlign: 'center',
                        fontWeight: '500',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      }}
                    >
                      {member.name}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* B팀 */}
            <motion.div
              layout
              style={{
                background: 'linear-gradient(135deg, #FCE4EC 0%, #F8BBD9 100%)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#E91E63',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                }}>
                  B
                </div>
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#C2185B' }}>
                  {teamB.length}명
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <AnimatePresence mode="popLayout">
                  {teamB.map((member) => (
                    <motion.div
                      key={member.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      style={{
                        padding: '0.8rem 1rem',
                        background: 'white',
                        borderRadius: '10px',
                        textAlign: 'center',
                        fontWeight: '500',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      }}
                    >
                      {member.name}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

          {/* 옵션 표시 */}
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: '#f5f5f5',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
            fontSize: '0.9rem',
            color: 'var(--color-text-light)',
          }}>
            {shuffleAll ? '🔀 전부 섞기 모드' : '↔️ 짝 교환 모드'}
          </div>

          {/* 결과 화면 광고 */}
          <div style={{ marginTop: '1.5rem' }}>
            <AdBanner size="medium-rectangle" />
          </div>
        </motion.div>
      )}
    </div>
  );
}
