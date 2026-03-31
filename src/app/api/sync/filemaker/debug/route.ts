import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../../utils/supabase/server';
import {
  getFileMakerToken,
  releaseFileMakerToken,
  getLayoutMetadata,
} from '../../../../../../utils/filemaker/client';

/**
 * Debug endpoint: returns the field names available on the FileMaker layouts.
 * Helps diagnose "Field is missing" (error 102) issues.
 */
export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  }

  // Verify admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  let token: string | null = null;
  try {
    token = await getFileMakerToken(username, password);

    const [scheduleFields, laneFields] = await Promise.all([
      getLayoutMetadata(token, 'qra_lk_schedule'),
      getLayoutMetadata(token, 'web_lk_lanes'),
    ]);

    return NextResponse.json({
      qra_lk_schedule: scheduleFields,
      web_lk_lanes: laneFields,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  } finally {
    if (token) await releaseFileMakerToken(token);
  }
}
