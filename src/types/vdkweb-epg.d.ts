declare module '@accedo/vdkweb-epg' {
  type GuideProps = {
    nrOfChannels: number;
    endTime: number;
    startTime: number;
    onGetTvListings: () => Promise<Response>;
  };

  type ProgramProps = {
    key: string;
    theme: { [className: string]: string };
    type: string;
    title: string;
    onClick?: () => void;
  };

  const ProgramGuide: React.ComponentType<GuideProps>;
  const StyledProgramGuide: React.ComponentType<GuideProps>;
  const Program: React.ComponentType<ProgramProps>;
  const ErrorFocusTile: React.ComponentType;
  const ProgramGuideTile: React.ComponentType;
  const FocusContainer: React.ComponentType;
  const formatProgramTime: (
    startTime: unknown,
    endTime: unknown,
    timeFormat: string,
  ) => string;
  const CurrentTimeMarker: React.ComponentType;
  const ProgramLane: React.ComponentType;
  const ChannelColumn: React.ComponentType;
  const Timeline: React.ComponentType;
  const TimeCell: React.ComponentType;
  const LoadingTile: React.ComponentType;
  const ErrorTile: React.ComponentType;
  const ChannelCell: React.ComponentType;
  const DaySelector: React.ComponentType;
  const DataGridView: React.ComponentType;
}
