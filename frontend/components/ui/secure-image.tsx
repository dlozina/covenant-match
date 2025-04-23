import Image, { ImageProps } from 'next/image';
import { useState } from 'react';
import { HTMLProps } from 'react';

interface SecureImageProps extends Omit<ImageProps, 'src'> {
  src: string;
  alt: string;
  fallback?: React.ReactNode;
}

/**
 * SecureImage component that handles image display securely
 * Uses plain img tag for uploads and Next.js Image for other sources
 */
export function SecureImage({ 
  src, 
  alt, 
  fallback,
  fill,
  className,
  onError,
  ...props 
}: SecureImageProps) {
  const [error, setError] = useState(false);

  // Handle image load error
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('Image load error:', src);
    setError(true);
    if (onError) {
      onError(e);
    }
  };

  // Show fallback if there's an error
  if (error && fallback) {
    return <>{fallback}</>;
  }

  // For uploads path, use a regular img tag to avoid Next.js optimization issues
  if (src && src.startsWith('/uploads/')) {
    // Filter props for HTML img element
    const imgProps: HTMLProps<HTMLImageElement> = {
      src,
      alt,
      className: `${fill ? 'absolute inset-0 w-full h-full' : ''} ${className || ''}`,
      onError: handleError,
      // Add any other needed props
      ...props as unknown as HTMLProps<HTMLImageElement>
    };
    
    return <img {...imgProps} />;
  }
  
  // For all other images, use standard Next.js Image component
  // TypeScript will handle this correctly since we're passing proper ImageProps
  return <Image src={src} alt={alt} className={className} fill={fill} onError={handleError as unknown as ImageProps['onError']} {...props} />;
} 