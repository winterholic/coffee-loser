import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Users, AlertCircle, Shuffle, RotateCcw, Plus, X, Check } from 'lucide-react';
import AdBanner from '../../components/ads/AdBanner';

type Step = 'people' | 'penalty-count' | 'penalty-types' | 'result';

type Person = {
  id: string;
  name: string;
  penalty: string | null;
  isRevealed: boolean;
};

const PRESET_PENALTIES = [
  { category: '사기', items: ['커피사기', '밥사기', '술사기', '숙취해소제 사기', '코인노래방 사기', '아이스크림 사오기'] },
  { category: '청소', items: ['설거지하기', '쓰레기 버리기', '화장실 청소하기', '퇴실 청소하기'] },
  { category: '퍼포먼스', items: ['춤 30초 추기', '애교 10초 하기', '건배사 하기'] },
];

export default function PenaltyPicker() {
  const [step, setStep] = useState<Step>('people');
  const [names, setNames] = useState<string[]>([]);
  const [nameInput, setNameInput] = useState('');
  const [penaltyCount, setPenaltyCount] = useState(1);
  const [penaltyTypes, setPenaltyTypes] = useState<string[]>([]);
  const [customPenalty, setCustomPenalty] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [allRevealed, setAllRevealed] = useState(false);

  // Step 1: 이름 추가
  const addName = () => {
    if (nameInput.trim() && !names.includes(nameInput.trim())) {
      setNames([...names, nameInput.trim()]);
      setNameInput('');
    }
  };

  const removeName = (name: string) => {
    setNames(names.filter(n => n !== name));
  };

  // Step 2: 벌칙 인원 확인
  const goToPenaltyCount = () => {
    if (names.length < 2) {
      alert('최소 2명 이상 입력해주세요!');
      return;
    }
    setStep('penalty-count');
  };

  // Step 3: 벌칙 종류 선택
  const goToPenaltyTypes = () => {
    if (penaltyCount < 1 || penaltyCount > names.length) {
      alert('올바른 벌칙 인원을 입력해주세요!');
      return;
    }
    setStep('penalty-types');
  };

  const togglePenalty = (penalty: string) => {
    if (penaltyTypes.includes(penalty)) {
      setPenaltyTypes(penaltyTypes.filter(p => p !== penalty));
    } else if (penaltyTypes.length < penaltyCount) {
      setPenaltyTypes([...penaltyTypes, penalty]);
    }
  };

  const addCustomPenalty = () => {
    if (customPenalty.trim() && !penaltyTypes.includes(customPenalty.trim()) && penaltyTypes.length < penaltyCount) {
      setPenaltyTypes([...penaltyTypes, customPenalty.trim()]);
      setCustomPenalty('');
    }
  };

  // Step 4: 결과 생성
  const generateResult = () => {
    if (penaltyTypes.length !== penaltyCount) {
      alert(`벌칙을 ${penaltyCount}개 선택해주세요! (현재 ${penaltyTypes.length}개)`);
      return;
    }

    // 사람들 섞기
    const shuffledNames = [...names].sort(() => Math.random() - 0.5);

    // 벌칙 배정
    const newPeople: Person[] = shuffledNames.map((name, idx) => ({
      id: `person-${idx}`,
      name,
      penalty: idx < penaltyCount ? penaltyTypes[idx] : null,
      isRevealed: false,
    }));

    // 다시 섞기 (순서 랜덤)
    newPeople.sort(() => Math.random() - 0.5);

    setPeople(newPeople);
    setStep('result');
    setAllRevealed(false);
  };

  // 쪽지 뒤집기
  const revealPerson = (id: string) => {
    setPeople(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, isRevealed: true } : p);
      if (updated.every(p => p.isRevealed)) {
        setAllRevealed(true);
      }
      return updated;
    });
  };

  const revealAll = () => {
    setPeople(prev => prev.map(p => ({ ...p, isRevealed: true })));
    setAllRevealed(true);
  };

  const resetGame = () => {
    setStep('people');
    setNames([]);
    setNameInput('');
    setPenaltyCount(1);
    setPenaltyTypes([]);
    setPeople([]);
    setAllRevealed(false);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '2rem' }}>
      {/* Step 1: 참가자 입력 */}
      {step === 'people' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Coffee size={48} color="var(--color-primary)" style={{ marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.8rem', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
              커피 누가 살래?
            </h2>
            <p style={{ color: 'var(--color-text-light)' }}>참가자를 입력해주세요</p>
          </div>

          {/* 이름 입력 */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addName()}
              placeholder="이름 입력"
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
              onClick={addName}
              style={{
                padding: '1rem 1.5rem',
                background: 'var(--color-primary)',
                color: 'white',
                borderRadius: 'var(--radius-lg)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <Plus size={20} />
            </button>
          </div>

          {/* 참가자 목록 */}
          <div style={{
            minHeight: '150px',
            background: 'var(--color-white)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem',
            marginBottom: '1.5rem',
            border: '1px solid #eee',
          }}>
            {names.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#aaa', padding: '2rem' }}>
                <Users size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <p>참가자를 추가해주세요</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {names.map((name, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      background: '#f0f0f0',
                      borderRadius: '20px',
                      fontSize: '0.95rem',
                    }}
                  >
                    {name}
                    <button
                      onClick={() => removeName(name)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                      }}
                    >
                      <X size={16} color="#999" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--color-text-light)' }}>
            현재 {names.length}명
          </div>

          <button
            onClick={goToPenaltyCount}
            disabled={names.length < 2}
            style={{
              width: '100%',
              padding: '1rem',
              background: names.length >= 2 ? 'var(--color-primary)' : '#ddd',
              color: 'white',
              borderRadius: 'var(--radius-lg)',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              border: 'none',
              cursor: names.length >= 2 ? 'pointer' : 'not-allowed',
            }}
          >
            다음 단계
          </button>
        </motion.div>
      )}

      {/* Step 2: 벌칙 인원 선택 */}
      {step === 'penalty-count' && (
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <AlertCircle size={48} color="var(--color-accent)" style={{ marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.8rem', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
              벌칙 인원
            </h2>
            <p style={{ color: 'var(--color-text-light)' }}>
              {names.length}명 중 몇 명이 벌칙을 받을까요?
            </p>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            marginBottom: '2rem',
          }}>
            <button
              onClick={() => setPenaltyCount(Math.max(1, penaltyCount - 1))}
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                border: '2px solid #ddd',
                background: 'white',
                fontSize: '1.5rem',
                cursor: 'pointer',
              }}
            >
              -
            </button>
            <div style={{
              fontSize: '3rem',
              fontWeight: 'bold',
              color: 'var(--color-accent)',
              minWidth: '80px',
              textAlign: 'center',
            }}>
              {penaltyCount}
            </div>
            <button
              onClick={() => setPenaltyCount(Math.min(names.length, penaltyCount + 1))}
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                border: '2px solid #ddd',
                background: 'white',
                fontSize: '1.5rem',
                cursor: 'pointer',
              }}
            >
              +
            </button>
          </div>

          <p style={{ textAlign: 'center', color: 'var(--color-text-light)', marginBottom: '2rem' }}>
            {names.length}명 중 {penaltyCount}명이 벌칙!
          </p>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setStep('people')}
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
              onClick={goToPenaltyTypes}
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
              }}
            >
              다음 단계
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 3: 벌칙 종류 선택 */}
      {step === 'penalty-types' && (
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
              벌칙 종류 선택
            </h2>
            <p style={{ color: 'var(--color-text-light)' }}>
              {penaltyCount}개의 벌칙을 선택하세요 (현재 {penaltyTypes.length}개)
            </p>
          </div>

          {/* 프리셋 벌칙 */}
          {PRESET_PENALTIES.map((category) => (
            <div key={category.category} style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-text-light)', fontSize: '0.9rem' }}>
                {category.category}
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {category.items.map((item) => {
                  const isSelected = penaltyTypes.includes(item);
                  const isDisabled = !isSelected && penaltyTypes.length >= penaltyCount;
                  return (
                    <button
                      key={item}
                      onClick={() => togglePenalty(item)}
                      disabled={isDisabled}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '20px',
                        border: isSelected ? '2px solid var(--color-accent)' : '2px solid #ddd',
                        background: isSelected ? 'var(--color-accent)' : 'white',
                        color: isSelected ? 'white' : isDisabled ? '#ccc' : 'var(--color-text)',
                        fontSize: '0.9rem',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {isSelected && <Check size={14} style={{ marginRight: '4px' }} />}
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* 직접 입력 */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-text-light)', fontSize: '0.9rem' }}>
              직접 입력
            </h4>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={customPenalty}
                onChange={(e) => setCustomPenalty(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCustomPenalty()}
                placeholder="벌칙 직접 입력"
                disabled={penaltyTypes.length >= penaltyCount}
                style={{
                  flex: 1,
                  padding: '0.8rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '2px solid #ddd',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
              <button
                onClick={addCustomPenalty}
                disabled={penaltyTypes.length >= penaltyCount}
                style={{
                  padding: '0.8rem 1.2rem',
                  background: penaltyTypes.length >= penaltyCount ? '#ddd' : 'var(--color-primary)',
                  color: 'white',
                  borderRadius: 'var(--radius-lg)',
                  border: 'none',
                  cursor: penaltyTypes.length >= penaltyCount ? 'not-allowed' : 'pointer',
                }}
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* 선택된 벌칙 표시 */}
          {penaltyTypes.length > 0 && (
            <div style={{
              padding: '1rem',
              background: '#FFF5F5',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '1.5rem',
            }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>
                선택된 벌칙:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {penaltyTypes.map((p, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '0.3rem 0.8rem',
                      background: 'var(--color-accent)',
                      color: 'white',
                      borderRadius: '15px',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    {p}
                    <button
                      onClick={() => setPenaltyTypes(penaltyTypes.filter(pt => pt !== p))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <X size={14} color="white" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setStep('penalty-count')}
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
              onClick={generateResult}
              disabled={penaltyTypes.length !== penaltyCount}
              style={{
                flex: 2,
                padding: '1rem',
                background: penaltyTypes.length === penaltyCount ? 'var(--color-accent)' : '#ddd',
                color: 'white',
                borderRadius: 'var(--radius-lg)',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                border: 'none',
                cursor: penaltyTypes.length === penaltyCount ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <Shuffle size={20} />
              결과 확인!
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 4: 결과 */}
      {step === 'result' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.8rem', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
              쪽지를 뽑아보세요!
            </h2>
            <p style={{ color: 'var(--color-text-light)' }}>
              클릭해서 결과를 확인하세요
            </p>
          </div>

          {/* 쪽지들 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}>
            <AnimatePresence>
              {people.map((person) => (
                <motion.div
                  key={person.id}
                  layout
                  initial={{ scale: 0, rotate: 180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  whileHover={!person.isRevealed ? { y: -5, scale: 1.02 } : {}}
                  onClick={() => !person.isRevealed && revealPerson(person.id)}
                  style={{
                    perspective: '1000px',
                    cursor: person.isRevealed ? 'default' : 'pointer',
                  }}
                >
                  <motion.div
                    animate={{ rotateY: person.isRevealed ? 180 : 0 }}
                    transition={{ duration: 0.6, type: 'spring' }}
                    style={{
                      position: 'relative',
                      height: '180px',
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    {/* 앞면 (뒷면 디자인) */}
                    <div style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      backfaceVisibility: 'hidden',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: 'var(--radius-lg)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                    }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>❓</div>
                      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
                        클릭!
                      </div>
                    </div>

                    {/* 뒷면 (결과) */}
                    <div style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      background: person.penalty ?
                        'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)' :
                        'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                      borderRadius: 'var(--radius-lg)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1rem',
                      boxShadow: person.penalty ?
                        '0 4px 20px rgba(238,90,90,0.4)' :
                        '0 4px 15px rgba(0,0,0,0.1)',
                      border: person.penalty ? 'none' : '2px solid #ddd',
                    }}>
                      {/* 이름 */}
                      <div style={{
                        fontSize: '1.3rem',
                        fontWeight: 'bold',
                        color: person.penalty ? 'white' : 'var(--color-text)',
                        marginBottom: '0.5rem',
                      }}>
                        {person.name}
                      </div>

                      {/* 구분선 */}
                      <div style={{
                        width: '60%',
                        height: '2px',
                        background: person.penalty ? 'rgba(255,255,255,0.3)' : '#ddd',
                        marginBottom: '0.5rem',
                      }} />

                      {/* 결과 */}
                      {person.penalty ? (
                        <>
                          <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>☕</div>
                          <div style={{
                            fontSize: '0.9rem',
                            color: 'white',
                            textAlign: 'center',
                            fontWeight: 'bold',
                          }}>
                            {person.penalty}
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>😊</div>
                          <div style={{
                            fontSize: '0.95rem',
                            color: '#28a745',
                            fontWeight: 'bold',
                          }}>
                            안전!
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* 버튼들 */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            {!allRevealed && (
              <button
                onClick={revealAll}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: 'var(--color-text)',
                  color: 'white',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '1rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                전부 공개
              </button>
            )}
            <button
              onClick={resetGame}
              style={{
                flex: 1,
                padding: '1rem',
                background: 'var(--color-primary)',
                color: 'white',
                borderRadius: 'var(--radius-lg)',
                fontSize: '1rem',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <RotateCcw size={18} />
              다시하기
            </button>
          </div>

          {/* 결과 요약 (전부 공개 시) */}
          <AnimatePresence>
            {allRevealed && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginTop: '2rem',
                  padding: '1.5rem',
                  background: 'var(--color-white)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)', textAlign: 'center' }}>
                  🎉 결과 요약
                </h3>

                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--color-accent)', marginBottom: '0.5rem' }}>
                    ☕ 벌칙 당첨자
                  </h4>
                  {people.filter(p => p.penalty).map(p => (
                    <div key={p.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.5rem 1rem',
                      background: '#FFF5F5',
                      borderRadius: '8px',
                      marginBottom: '0.3rem',
                    }}>
                      <span style={{ fontWeight: 'bold' }}>{p.name}</span>
                      <span style={{ color: 'var(--color-accent)' }}>{p.penalty}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <h4 style={{ fontSize: '0.9rem', color: '#28a745', marginBottom: '0.5rem' }}>
                    😊 안전한 사람들
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {people.filter(p => !p.penalty).map(p => (
                      <span key={p.id} style={{
                        padding: '0.3rem 0.8rem',
                        background: '#E8F5E9',
                        borderRadius: '15px',
                        fontSize: '0.9rem',
                        color: '#28a745',
                      }}>
                        {p.name}
                      </span>
                    ))}
                  </div>
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
