import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Coffee, Flag, GitMerge, Users, Crosshair, ChevronRight } from 'lucide-react';
import AdBanner from '../components/ads/AdBanner';
import '../index.css';

const games = [
    {
        id: 'race',
        title: '끝까지 가야대',
        description: '끝까지 모르는 도파민 맥스 달리기 경주.',
        icon: <Flag size={32} />,
        color: '#FF6B6B'
    },
    {
        id: 'ladder',
        title: '사다리 타기',
        description: '빠라바라밤빰~ 빠라바라밤빰~ 사다리타자~',
        icon: <GitMerge size={32} />,
        color: '#4ECDC4'
    },
    {
        id: 'penalty',
        title: '커피 누가사?',
        description: '오늘의 지갑 전사는?',
        icon: <Coffee size={32} />,
        color: '#45B7D1'
    },
    {
        id: 'team',
        title: '팀 나누기',
        description: '내전하고 싶을 땐 슈웃~~',
        icon: <Users size={32} />,
        color: '#96CEB4'
    },
    {
        id: 'dart',
        title: '다트 게임',
        description: '돌려돌려 돌림판~',
        icon: <Crosshair size={32} />,
        color: '#D4A5A5'
    }
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: "spring" as const,
            stiffness: 100
        }
    }
};

export default function Home() {
    const navigate = useNavigate();

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
            <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <div style={{
                        display: 'inline-flex',
                        padding: '1rem',
                        background: 'var(--color-text)',
                        borderRadius: '20px',
                        marginBottom: '1rem'
                    }}>
                        <Coffee color="var(--color-secondary)" size={40} />
                    </div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--color-primary)' }}>너 오늘 커피사라</h1>
                    <p style={{ color: 'var(--color-text-light)' }}>도파민을 찾아서 오셨다면 정답입니다.</p>
                </motion.div>
            </header>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                style={{ display: 'grid', gap: '1rem' }}
            >
                {games.map((game) => (
                    <motion.div
                        key={game.id}
                        variants={itemVariants}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate(`/game/${game.id}`)}
                        style={{
                            background: 'var(--color-white)',
                            padding: '1.5rem',
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: 'var(--shadow-md)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            border: `1px solid rgba(0,0,0,0.05)`
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                padding: '0.75rem',
                                background: `${game.color}20`,
                                borderRadius: '12px',
                                color: game.color
                            }}>
                                {game.icon}
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>{game.title}</h3>
                                <p style={{ fontSize: '0.9rem', color: '#888' }}>{game.description}</p>
                            </div>
                        </div>
                        <ChevronRight color="#CCC" />
                    </motion.div>
                ))}
            </motion.div>

            {/* 광고 영역 */}
            <div style={{ marginTop: '2rem' }}>
                <AdBanner size="large-banner" />
            </div>
        </div>
    );
}
