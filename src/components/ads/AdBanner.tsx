import { useEffect, useRef } from 'react';

type AdSize = 'banner' | 'large-banner' | 'medium-rectangle' | 'full-width';

interface AdBannerProps {
  size?: AdSize;
  className?: string;
  style?: React.CSSProperties;
}

const AD_SIZES: Record<AdSize, { width: string; height: string; label: string }> = {
  'banner': { width: '320px', height: '50px', label: '배너 광고' },
  'large-banner': { width: '320px', height: '100px', label: '대형 배너' },
  'medium-rectangle': { width: '300px', height: '250px', label: '직사각형 광고' },
  'full-width': { width: '100%', height: '90px', label: '전면 배너' },
};

// Google AdSense 광고 슬롯 ID (나중에 실제 값으로 교체)
const AD_SLOT_IDS: Record<AdSize, string> = {
  'banner': 'YOUR_BANNER_SLOT_ID',
  'large-banner': 'YOUR_LARGE_BANNER_SLOT_ID',
  'medium-rectangle': 'YOUR_RECTANGLE_SLOT_ID',
  'full-width': 'YOUR_FULL_WIDTH_SLOT_ID',
};

// 프로덕션 환경 여부 (실제 광고 표시 여부 결정)
const IS_PRODUCTION = import.meta.env.PROD;
const ADSENSE_CLIENT_ID = 'ca-pub-XXXXXXXXXXXXXXXX'; // 나중에 실제 AdSense ID로 교체

export default function AdBanner({ size = 'banner', className, style }: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const { width, height, label } = AD_SIZES[size];

  useEffect(() => {
    // 프로덕션 환경에서만 광고 로드
    if (IS_PRODUCTION && adRef.current) {
      try {
        // Google AdSense 광고 로드
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch (e) {
        console.error('AdSense error:', e);
      }
    }
  }, []);

  // 개발 환경: 플레이스홀더 표시
  if (!IS_PRODUCTION) {
    return (
      <div
        className={className}
        style={{
          width,
          height,
          maxWidth: '100%',
          margin: '0 auto',
          background: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
          border: '2px dashed #ccc',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
          fontSize: '0.85rem',
          gap: '4px',
          ...style,
        }}
      >
        <span style={{ fontSize: '1.2rem' }}>📢</span>
        <span>{label}</span>
        <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>광고 영역</span>
      </div>
    );
  }

  // 프로덕션 환경: 실제 Google AdSense 광고
  return (
    <div
      ref={adRef}
      className={className}
      style={{
        width,
        maxWidth: '100%',
        margin: '0 auto',
        textAlign: 'center',
        overflow: 'hidden',
        ...style,
      }}
    >
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          width: '100%',
          height,
        }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={AD_SLOT_IDS[size]}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
