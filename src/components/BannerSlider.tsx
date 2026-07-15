// src/components/BannerSlider.tsx

import React, {
useState,
useEffect,
useRef,
useCallback,
memo,
} from 'react';
import type { Banner } from './BannerSlider.types';

interface BannerSliderProps {
banners: Banner[];
autoPlayInterval?: number;
onCtaClick?: (banner: Banner) => void;
}

const SliderDots = memo(({
count,
active,
onDotClick,
}: {
count: number;
active: number;
onDotClick: (i: number) => void;
}) => (

  <div
    style={{
      display: 'flex',
      gap: 6,
      justifyContent: 'center',
      marginTop: 9,
      marginBottom: 4,
    }}
  >
    {Array.from({ length: count }).map((_, i) => (
      <button
        key={i}
        onClick={() => onDotClick(i)}
        aria-label={`Go to slide ${i + 1}`}
        title={`Slide ${i + 1}`}
        style={{
          width: 24,
          height: 24,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
      >
        <span
          style={{
            width: i === active ? 20 : 6,
            height: 6,
            borderRadius: 99,
            background:
              i === active
                ? 'rgba(234,179,8,0.9)'
                : 'rgba(255,255,255,0.2)',
            transition:
              'width 0.3s ease, background 0.3s ease',
          }}
        />
      </button>
    ))}
  </div>
));

SliderDots.displayName = 'SliderDots';

const BannerSlide = memo(({
banner,
onCtaClick,
}: {
banner: Banner;
onCtaClick?: (banner: Banner) => void;
}) => (

  <div
    style={{
      position: 'absolute',
      inset: 0,
      borderRadius: 16,
      overflow: 'hidden',
      background:
        banner.gradient ||
        'linear-gradient(135deg, #1e1b4b, #0f172a)',
      zIndex: 1,
    }}
  >
    {banner.image && (
      <img
        src={banner.image}
        alt={banner.title}
        loading="lazy"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.4,
        }}
      />
    )}


<div
  style={{
    position: 'relative',
    zIndex: 2,
    padding: '20px 24px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  }}
>
  <h2
    style={{
      fontSize: 18,
      fontWeight: 900,
      color: '#fff',
      margin: 0,
      lineHeight: 1.3,
      textShadow: '0 2px 8px rgba(0,0,0,0.5)',
    }}
  >
    {banner.title}
  </h2>

  {banner.subtitle && (
    <p
      style={{
        fontSize: 13,
        color: 'rgba(255,255,255,0.75)',
        margin: '6px 0 0',
      }}
    >
      {banner.subtitle}
    </p>
  )}

  {banner.cta && onCtaClick && (
    <button
      onClick={() => onCtaClick(banner)}
      style={{
        marginTop: 14,
        alignSelf: 'flex-start',
        padding: '8px 18px',
        borderRadius: 10,
        border: 'none',
        background:
          'linear-gradient(135deg, #eab308, #a16207)',
        color: '#000',
        fontWeight: 800,
        fontSize: 13,
        cursor: 'pointer',
      }}
    >
      {banner.cta}
    </button>
  )}
</div>


  </div>
));

BannerSlide.displayName = 'BannerSlide';

const BannerSlider: React.FC<BannerSliderProps> = memo(({
banners,
autoPlayInterval = 4000,
onCtaClick,
}) => {
const [currentSlide, setCurrentSlide] = useState(0);

const isPausedRef = useRef(false);
const currentSlideRef = useRef(0);

useEffect(() => {
if (banners.length <= 1) return;


const interval = setInterval(() => {
  if (isPausedRef.current) return;

  const next =
    currentSlideRef.current === banners.length - 1
      ? 0
      : currentSlideRef.current + 1;

  currentSlideRef.current = next;
  setCurrentSlide(next);
}, autoPlayInterval);

return () => clearInterval(interval);


}, [banners.length, autoPlayInterval]);

const goToSlide = useCallback((index: number) => {
currentSlideRef.current = index;
setCurrentSlide(index);
}, []);

const handleMouseEnter = useCallback(() => {
isPausedRef.current = true;
}, []);

const handleMouseLeave = useCallback(() => {
isPausedRef.current = false;
}, []);

if (!banners.length) return null;

const activeBanner = banners[currentSlide];

return (
<div
style={{
width: '100%',
position: 'relative',
zIndex: 0,
}}
>
<div
onMouseEnter={handleMouseEnter}
onMouseLeave={handleMouseLeave}
style={{
position: 'relative',
width: '100%',
height: 120,
borderRadius: 16,
overflow: 'hidden',
background: '#0f0b1e',
cursor: 'pointer',
}}
> <BannerSlide
       key={activeBanner.id}
       banner={activeBanner}
       onCtaClick={onCtaClick}
     />


    {banners.length > 1 && (
      <>
        <button
          onClick={() =>
            goToSlide(
              currentSlide === 0
                ? banners.length - 1
                : currentSlide - 1
            )
          }
          aria-label="Previous slide"
          style={{
            position: 'absolute',
            left: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            border: 'none',
            background: 'rgba(0,0,0,0.4)',
            color: '#fff',
            width: 28,
            height: 28,
            borderRadius: '50%',
            cursor: 'pointer',
          }}
        >
          ‹
        </button>

        <button
          onClick={() =>
            goToSlide(
              currentSlide === banners.length - 1
                ? 0
                : currentSlide + 1
            )
          }
          aria-label="Next slide"
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            border: 'none',
            background: 'rgba(0,0,0,0.4)',
            color: '#fff',
            width: 28,
            height: 28,
            borderRadius: '50%',
            cursor: 'pointer',
          }}
        >
          ›
        </button>
      </>
    )}
  </div>

  {banners.length > 1 && (
    <SliderDots
      count={banners.length}
      active={currentSlide}
      onDotClick={goToSlide}
    />
  )}
</div>


);
});

BannerSlider.displayName = 'BannerSlider';

export default BannerSlider;
