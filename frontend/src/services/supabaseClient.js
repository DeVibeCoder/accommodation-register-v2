import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cwmmmrhhtkufkdwxwrjs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3bW1tcmhodGt1Zmtkd3h3cmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NTgyMjgsImV4cCI6MjA5MTEzNDIyOH0.vmQhriwPNW3J9nMiXUcaqnjl_OA7RZAmxMzcUpCjcMo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
