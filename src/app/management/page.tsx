import { createClient } from '../../../utils/supabase/server';
import Link from 'next/link';
import {
  Trophy,
  Users,
  Clock,
  Eye,
  Settings,
  FileText,
  BarChart2,
  Radio,
} from 'lucide-react';

interface ActiveCard {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  roles: ('admin' | 'timer')[];
}

interface PlaceholderCard {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

const activeCards: ActiveCard[] = [
  {
    title: 'Regattas',
    description: 'Manage regattas, races, and event schedules',
    href: '/regattas',
    icon: Trophy,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    roles: ['admin'],
  },
  {
    title: 'Teams',
    description: 'View and manage participating teams and entries',
    href: '/teams',
    icon: Users,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    roles: ['admin'],
  },
  {
    title: 'Timing',
    description: 'Race timing interface for finish line officials',
    href: '/timer',
    icon: Clock,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    roles: ['admin', 'timer'],
  },
  {
    title: 'Results',
    description: 'Public spectator view of race results',
    href: '/spectator',
    icon: Eye,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    roles: ['admin', 'timer'],
  },
  {
    title: 'Admin',
    description: 'Manage users, roles, and permissions',
    href: '/admin/users',
    icon: Settings,
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
    roles: ['admin'],
  },
];

const placeholderCards: PlaceholderCard[] = [
  {
    title: 'Reports',
    description: 'Export race results and timing data',
    icon: FileText,
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
  },
  {
    title: 'Live Leaderboard',
    description: 'Real-time race standings display',
    icon: BarChart2,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
  },
  {
    title: 'Announcements',
    description: 'Broadcast messages to spectators',
    icon: Radio,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
  },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userRole: 'admin' | 'timer' | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    userRole = profile?.role ?? null;
  }

  const visibleCards = activeCards.filter(
    card => userRole && card.roles.includes(userRole)
  );

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">QRA Management</h1>
          <p className="text-gray-500 mt-1">Race management and administration</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleCards.map(card => (
            <Link key={card.title} href={card.href} className="group block">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 h-full">
                <div className={`w-11 h-11 rounded-lg ${card.iconBg} flex items-center justify-center mb-4`}>
                  <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <h2 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
                  {card.title}
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {card.description}
                </p>
              </div>
            </Link>
          ))}

          {userRole === 'admin' && placeholderCards.map(card => (
            <div
              key={card.title}
              className="bg-white rounded-xl border border-gray-200 border-dashed p-6 opacity-50 cursor-not-allowed h-full"
            >
              <div className={`w-11 h-11 rounded-lg ${card.iconBg} flex items-center justify-center mb-4`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-semibold text-gray-900">
                  {card.title}
                </h2>
                <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  Coming Soon
                </span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
