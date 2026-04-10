declare module '@accedo/vdkweb-grid' {
  import { ReactElement } from 'react';

  type ItemSize = {
    itemWidth: number;
    itemHeight: number;
  };

  type Breakpoint = { [id: number]: ItemSize };

  type ResponsiveProps = {
    displayObject: ReactElement;
    horizontalMargin?: number;
    isAnimated: boolean;
    itemHeight: number;
    items: any[];
    itemWidth: number;
    keyProperty: string;
    onItemClick?: any;
    verticalMargin?: number;
    responsiveSizes: Breakpoint;
  };

  const ResponsiveGrid: React.ComponentType<ResponsiveProps>;
}
