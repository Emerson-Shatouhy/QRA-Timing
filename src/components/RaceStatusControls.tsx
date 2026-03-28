'use client';

import { useState } from 'react';
import { Race, RaceStatus } from '../../utils/types/race';
import { updateRaceStatus } from '../../utils/races/getRace';
import { createClient } from '../../utils/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';

interface RaceStatusControlsProps {
  race: Race;
  raceId: string;
}

type PendingAction = 'mark-ready' | 'mark-started' | 'finish-race' | 'abandon-race' | 'cancel-race' | 'revert-scheduled' | 'officialize' | null;

export default function RaceStatusControls({ race, raceId }: RaceStatusControlsProps) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmAction = async () => {
    setLoading(true);
    setError(null);

    try {
      const raceIdNum = BigInt(raceId);

      switch (pendingAction) {
        case 'mark-ready':
          await updateRaceStatus(raceIdNum, RaceStatus.READY);
          break;
        case 'mark-started':
          await updateRaceStatus(raceIdNum, RaceStatus.STARTED);
          break;
        case 'finish-race':
          await updateRaceStatus(raceIdNum, RaceStatus.FINISHED);
          break;
        case 'abandon-race':
          await updateRaceStatus(raceIdNum, RaceStatus.ABANDONED);
          break;
        case 'cancel-race':
          await updateRaceStatus(raceIdNum, RaceStatus.CANCELLED);
          break;
        case 'revert-scheduled':
          await updateRaceStatus(raceIdNum, RaceStatus.SCHEDULED);
          break;
        case 'officialize':
          const supabase = createClient();
          const { error: updateError } = await supabase
            .from('races')
            .update({ is_official: true })
            .eq('id', Number(raceIdNum));
          if (updateError) {
            throw new Error(`Failed to officialize results: ${updateError.message}`);
          }
          break;
      }

      setPendingAction(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getActionDescription = (action: PendingAction): string => {
    switch (action) {
      case 'mark-ready':
        return 'The race will be marked as ready. Participants can begin preparing.';
      case 'mark-started':
        return 'The race will be marked as started. Make sure all timing systems are ready.';
      case 'finish-race':
        return 'The race will be marked as finished. Results will become available.';
      case 'abandon-race':
        return 'The race will be marked as abandoned. This cannot be undone.';
      case 'cancel-race':
        return 'The race will be cancelled. This cannot be undone.';
      case 'revert-scheduled':
        return 'The race will be reverted to scheduled status.';
      case 'officialize':
        return 'This will lock the results. This cannot be undone.';
      default:
        return '';
    }
  };

  const isDestructive = (action: PendingAction): boolean => {
    return ['cancel-race', 'abandon-race', 'officialize'].includes(action || '');
  };

  // Render based on race status
  if (race.race_status === RaceStatus.CANCELLED) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Race Controls</h2>
        <p className="text-red-600 text-sm font-medium">This race has been cancelled.</p>
      </div>
    );
  }

  if (race.race_status === RaceStatus.ABANDONED) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Race Controls</h2>
        <p className="text-orange-600 text-sm font-medium">This race was abandoned.</p>
      </div>
    );
  }

  if (race.race_status === RaceStatus.FINISHED && race.is_official) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Race Controls</h2>
        <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
          <span>Results Official ✓</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Race Controls</h2>

      {error && (
        <div className="text-red-600 text-sm p-3 bg-red-50 rounded border border-red-200">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {race.race_status === RaceStatus.SCHEDULED && (
          <>
            <Button
              onClick={() => setPendingAction('mark-ready')}
              disabled={loading}
              className="w-full"
            >
              Mark Ready
            </Button>
            <Button
              onClick={() => setPendingAction('cancel-race')}
              variant="destructive"
              disabled={loading}
              className="w-full"
            >
              Cancel Race
            </Button>
          </>
        )}

        {race.race_status === RaceStatus.READY && (
          <>
            <Button
              onClick={() => setPendingAction('mark-started')}
              disabled={loading}
              className="w-full"
            >
              Mark as Started
            </Button>
            <Button
              onClick={() => setPendingAction('revert-scheduled')}
              variant="outline"
              disabled={loading}
              className="w-full"
            >
              Revert to Scheduled
            </Button>
            <Button
              onClick={() => setPendingAction('cancel-race')}
              variant="destructive"
              disabled={loading}
              className="w-full"
            >
              Cancel Race
            </Button>
          </>
        )}

        {race.race_status === RaceStatus.STARTED && (
          <>
            <Button
              onClick={() => setPendingAction('finish-race')}
              disabled={loading}
              className="w-full"
            >
              Finish Race
            </Button>
            <Button
              onClick={() => setPendingAction('abandon-race')}
              variant="destructive"
              disabled={loading}
              className="w-full"
            >
              Abandon Race
            </Button>
          </>
        )}

        {race.race_status === RaceStatus.FINISHED && !race.is_official && (
          <Button
            onClick={() => setPendingAction('officialize')}
            disabled={loading}
            className="w-full"
          >
            Officialize Results
          </Button>
        )}
      </div>

      <Dialog open={pendingAction !== null} onOpenChange={(open) => {
        if (!open) setPendingAction(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {getActionDescription(pendingAction)}
          </DialogDescription>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={loading}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleConfirmAction}
              disabled={loading}
              variant={isDestructive(pendingAction) ? 'destructive' : 'default'}
            >
              {loading ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
