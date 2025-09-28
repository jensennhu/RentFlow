import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://czdfyssreozopqimlmcg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6ZGZ5c3NyZW96b3BxaW1sbWNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTI2NTg4MywiZXhwIjoyMDcwODQxODgzfQ.zlTPYexoRExsYp1rhJlqCPP7k7h9lf7Ekt1suBznBM0';
export const supabase = createClient(supabaseUrl, supabaseKey);