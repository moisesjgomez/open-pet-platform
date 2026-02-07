'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Static blur placeholder (gray gradient)
const BLUR_DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgEDBAMBAAAAAAAAAAAAAQIDAAQFBhESIRMxQWH/xAAVAQEBAAAAAAAAAAAAAAAAAAADBP/EABkRAAMBAQEAAAAAAAAAAAAAAAABAhEDIf/aAAwDAQACEEMPQD+f0lRlpaUlfS8wupooZD//2Q==';

interface ImageCarouselProps {
  images: string[];
  alt: string;
  priority?: boolean;
  className?: string;
}

export function ImageCarousel({ images, alt, priority = false, className = '' }: ImageCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    dragFree: false,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0]));

  // Track current slide
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    setSelectedIndex(index);
    // Lazy load: mark current and adjacent images for loading
    setLoadedImages(prev => {
      const next = new Set(prev);
      next.add(index);
      next.add((index + 1) % images.length);
      next.add((index - 1 + images.length) % images.length);
      return next;
    });
  }, [emblaApi, images.length]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  // Single image - no carousel needed
  if (images.length <= 1) {
    return (
      <div className={`relative aspect-square overflow-hidden rounded-2xl bg-gray-100 ${className}`}>
        <Image
          src={images[0] || '/placeholder-pet.jpg'}
          alt={alt}
          fill
          className="object-cover"
          priority={priority}
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
        />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Main Carousel */}
      <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
        <div className="flex">
          {images.map((src, index) => (
            <div key={index} className="relative aspect-square min-w-0 flex-[0_0_100%]">
              {loadedImages.has(index) ? (
                <Image
                  src={src}
                  alt={`${alt} - Photo ${index + 1}`}
                  fill
                  className="object-cover"
                  priority={priority && index === 0}
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                />
              ) : (
                <div className="w-full h-full bg-gray-200 animate-pulse" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={scrollPrev}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all"
        aria-label="Previous image"
      >
        <ChevronLeft className="w-5 h-5 text-gray-700" />
      </button>
      <button
        onClick={scrollNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all"
        aria-label="Next image"
      >
        <ChevronRight className="w-5 h-5 text-gray-700" />
      </button>

      {/* Dot Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === selectedIndex 
                ? 'bg-white w-4' 
                : 'bg-white/60 hover:bg-white/80'
            }`}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>

      {/* Image Counter */}
      <div className="absolute top-4 right-4 z-10 bg-black/50 text-white text-sm px-2 py-1 rounded-full">
        {selectedIndex + 1} / {images.length}
      </div>
    </div>
  );
}
