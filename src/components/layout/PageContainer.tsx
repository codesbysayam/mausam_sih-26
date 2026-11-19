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
        fluid ? 'w-full px-4 sm:px-6' : 'mausam-page'
      } py-6 sm:py-8 flex-1 min-w-0 overflow-x-hidden safe-area-bottom ${className}`}
    >
      {children}
    </Component>
  );
};

