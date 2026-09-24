import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  const code = req.query.code

  if (!code) {
    return res.status(400).json({ error: 'No se recibió el código de autorización de Lucasta Hub.' })
  }

  const clientId = process.env.LUCASTA_CLIENT_ID || 'teenshub'
  const clientSecret = process.env.LUCASTA_CLIENT_SECRET
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!clientSecret) {
    return res.status(500).json({ error: 'Falta configurar LUCASTA_CLIENT_SECRET en las variables de entorno de Vercel.' })
  }

  try {
    // 1. Intercambiar el código con Lucasta Hub para obtener el token de acceso
    const tokenResponse = await fetch('https://lucastahub.vercel.app/api/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: String(code),
        grant_type: 'authorization_code',
        redirect_uri: 'https://teenhub.vercel.app/api/auth/callback'
      })
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Error de Lucasta Hub Token:', tokenData)
      return res.status(400).json({
        error: 'Fallo al obtener el token de acceso de Lucasta Hub',
        details: tokenData
      })
    }

    // 2. Consultar la información del usuario en Lucasta Hub
    const userResponse = await fetch('https://lucastahub.vercel.app/api/oauth/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    })

    const userData = await userResponse.json()

    if (!userResponse.ok) {
      return res.status(400).json({ error: 'Error al obtener la información del usuario', details: userData })
    }

    // 3. Redirigir de vuelta a la aplicación pasando la sesión
    // (Puedes guardar la información en una cookie de sesión o URL según tu lógica)
    return res.redirect(`/?auth=success&user=${encodeURIComponent(userData.email || userData.id)}`)

  } catch (err: any) {
    console.error('Error crítico en OAuth Callback:', err)
    return res.status(500).json({ error: 'Error interno en el servidor', message: err.message })
  }
}
