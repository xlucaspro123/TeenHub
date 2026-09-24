import { createClient } from '@supabase/supabase-js'

// Leemos las variables de entorno configuradas en Vercel o tu archivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Advertencia: Faltan las variables de entorno de Supabase.')
}

// Inicializamos el cliente de Supabase para exportarlo a toda la app
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
