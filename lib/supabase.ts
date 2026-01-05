import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zzmsxzrrpffrwqwqrncr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6bXN4enJycGZmcndxd3FybmNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzOTI3MjYsImV4cCI6MjA3OTk2ODcyNn0.wo344uB3_i-mxTN6qB-Hsbhg_o2IHP67UKrP8yWXECg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)