'use client';

import { useProfile } from '@/contexts/ProfileContext';
import { logout } from '@/app/login/action';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

export default function UserDropdown() {
  const { profile, loading } = useProfile();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const displayName = profile?.display_name || profile?.email || 'User';
  const email = profile?.email || '';

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  if (loading) {
    return <div className="w-24 h-9 bg-gray-200 rounded animate-pulse" />;
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
      >
        {displayName}
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-56 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-50"
        >
          {/* Email Display */}
          {email && (
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-xs text-gray-500">{email}</p>
            </div>
          )}

          {/* Profile Link */}
          <Link
            href="/management/profile"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Profile
          </Link>

          {/* Divider */}
          <div className="border-t border-gray-100 my-1" />

          {/* Logout Button */}
          <form action={logout} className="w-full">
            <button
              type="submit"
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Logout
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
