import { useNotifications } from '@/src/hooks/useNotifications';
import { Bell } from 'lucide-react';

export default function Ticker() {
  const notifications = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="bg-amber text-navy py-2 overflow-hidden whitespace-nowrap">
      <div className="inline-block animate-marquee">
        {notifications.map((note, index) => (
          <span key={note.id} className="mx-8 font-bold text-sm inline-flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="font-bold">THÔNG BÁO {index + 1}.</span> {note.text}
          </span>
        ))}
      </div>
    </div>
  );
}
