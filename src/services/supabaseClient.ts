import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://czdfyssreozopqimlmcg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6ZGZ5c3NyZW96b3BxaW1sbWNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNjU4ODMsImV4cCI6MjA3MDg0MTg4M30.FWDxHaQcq1eUkjJde8HQu5_GmIMXPppQr5Vi7v3ntic';
export const supabase = createClient(supabaseUrl, supabaseKey);