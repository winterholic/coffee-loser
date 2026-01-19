import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Coffee, Flag, GitMerge, Users, Crosshair } from 'lucide-react';
import AdBanner from '../ads/AdBanner';

const tabs = [
    { id: 'race', label: '끝까지', icon: <Flag size={18} /> },
    { id: 'ladder', label: '사다리', icon: <GitMerge size={18} /> },
    { id: 'penalty', label: '커피내기', icon: <Coffee size={18} /> },
    { id: 'team', label: '팀나누기', icon: <Users size={18} /> },
    { id: 'dart', label: '다트', icon: <Crosshair size={18} /> },
];

export default function GameLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { gameId } = useParams();

    // 현재 게임 ID가 탭에 없으면 기본값으로 처리할 수도 있지만, 라우터에서 처리

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 0 }}>
            {/* Header */}
            <header style={{
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                background: 'var(--color-white)',
                boxShadow: 'var(--shadow-sm)',
                zIndex: 10
            }}>
                <button onClick={() => navigate('/')} style={{ padding: '0.5rem' }}>
                    <ArrowLeft size={24} color="var(--color-text)" />
                </button>
                <h2 style={{ fontSize: '1.2rem', flex: 1 }}>
                    {tabs.find(t => t.id === gameId)?.label || '게임'}
                </h2>
            </header>

            {/* Tab Navigation (Top Scrollable) */}
            <div style={{
                background: 'var(--color-white)',
                borderBottom: '1px solid #eee',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                display: 'flex',
                padding: '0 0.5rem',
                scrollbarWidth: 'none' // Hide scrollbar for cleaner look
            }}>
                {tabs.map((tab) => {
                    const isActive = location.pathname.includes(`/game/${tab.id}`);
                    return (
                        <button
                            key={tab.id}
                            onClick={() => navigate(`/game/${tab.id}`)}
                            style={{
                                flex: '0 0 auto',
                                padding: '0.8rem 1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                color: isActive ? 'var(--color-primary)' : 'var(--color-text-light)',
                                fontWeight: isActive ? 700 : 400,
                                borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                                transition: 'all 0.2s'
                            }}
                        >
                            <span style={{ color: isActive ? 'var(--color-primary)' : 'inherit' }}>{tab.icon}</span>
                            <span style={{ fontSize: '0.9rem' }}>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <main style={{ flex: 1, overflowY: 'auto', padding: '1rem', paddingBottom: '70px', position: 'relative' }}>
                <Outlet />
            </main>

            {/* 하단 고정 광고 */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'var(--color-white)',
                borderTop: '1px solid #eee',
                padding: '0.5rem',
                zIndex: 100,
            }}>
                <AdBanner size="banner" />
            </div>
        </div>
    );
}
