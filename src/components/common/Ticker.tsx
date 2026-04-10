import { useNotifications } from '@/src/hooks/useNotifications';
import { Bell } from 'lucide-react';

export default function Ticker() {
  const notifications = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="bg-amber text-navy py-2 overflow-hidden whitespace-nowrap flex items-center">
      <div className="inline-block animate-marquee flex items-center">
        {notifications.map((note, index) => (
          <span key={index} className="mx-8 font-bold text-sm flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {note}
          </span>
        ))}
      </div>
    </div>
  );
}
