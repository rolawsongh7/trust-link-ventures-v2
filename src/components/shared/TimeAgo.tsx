import { formatDistanceToNow } from 'date-fns';

interface TimeAgoProps {
  timestamp: string | Date;
  addSuffix?: boolean;
}

export const TimeAgo = ({ timestamp, addSuffix = true }: TimeAgoProps) => {
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return <>{formatDistanceToNow(date, { addSuffix })}</>;
  } catch (error) {
    return <>recently</>;
  }
};
