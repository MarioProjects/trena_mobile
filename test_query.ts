import { supabase } from './lib/supabase';
async function test() {
  const id = 'some-id';
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id')
    .contains('snapshot', { exercises: [{ source: { methodInstanceId: id } }] })
    .limit(1);
  console.log({ data, error });
}
