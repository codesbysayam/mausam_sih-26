import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  as?: 'div' | 'main' | 'section' | 'article';
  fluid?: boolean;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className = '',
  id = 'mausam-page-container',
  as: Component = 'div',
  fluid = false,
}) => {
  return (
    <Component
      id={id}
      className={`w-full ${
        fluid ? 'page-container-wide' : 'mausam-page'
      } py-5 sm:py-7 lg:py-8 flex-1 min-w-0 overflow-x-clip safe-area-bottom ${className}`}
    >
      {children}
    </Component>
  );
};

