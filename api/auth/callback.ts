import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  // 1. Obtener las variables DENTRO del handler
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  // 2. Validar que existan las credenciales para evitar el colapso 500
  if (!supabaseUrl || !supabaseKey) {
    console.error('Error de entorno: Faltan SUPABASE_URL o SUPABASE_ANON_KEY en Vercel')
    return res.status(500).json({
      error: 'Error de configuración en el servidor. Revisa las variables de entorno en Vercel.'
    })
  }

  // 3. Crear el cliente de Supabase de manera segura
  const supabase = createClient(supabaseUrl, supabaseKey)

  const code = req.query.code

  if (!code) {
    return res.redirect('/?error=no_code_provided')
  }

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(String(code))
    if (error) {
      console.error('Error intercambiando código:', error.message)
      return res.redirect(`/?error=${encodeURIComponent(error.message)}`)
    }

    // Autenticación exitosa, redirigir a la app
    return res.redirect('/')
  } catch (err: any) {
    console.error('Error inesperado en callback:', err)
    return res.status(500).json({ error: err.message || 'Error interno en el servidor' })
  }
}
