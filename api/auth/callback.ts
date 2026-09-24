import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Cliente con permisos administrativos para crear usuarios y sesiones
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code } = req.query

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Código de autorización no proporcionado' })
  }

  try {
    // 1. Canjear el código recibido por los datos del usuario en Lucasta Hub
    const tokenResponse = await fetch(process.env.LUCASTA_TOKEN_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.LUCASTA_CLIENT_ID,
        client_secret: process.env.LUCASTA_CLIENT_SECRET,
        redirect_uri: process.env.LUCASTA_REDIRECT_URI
      })
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok || !tokenData.access_token) {
      return res.status(400).json({ error: tokenData.error || 'Error al validar token con Lucasta Hub' })
    }

    const { user } = tokenData // Contiene: id, email, display_name, avatar_url, role

    // 2. Registrar o actualizar la cuenta en la tabla de perfiles
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!existingProfile) {
      await supabaseAdmin.from('profiles').insert({
        id: user.id,
        username: user.display_name || user.email.split('@')[0],
        avatar_url: user.avatar_url,
        feeling_tag: 'Feliz',
        xp: 0
      })
    }

    // 3. Crear enlace mágico de autenticación e iniciar sesión automáticamente
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email
    })

    if (linkError || !linkData.properties?.action_link) {
      throw new Error('Error al generar el acceso directo a la aplicación')
    }

    // Redireccionar al usuario dentro de TeensHub con la sesión activa
    return res.redirect(302, linkData.properties.action_link)

  } catch (err: any) {
    console.error('OAuth Callback Error:', err)
    return res.status(500).json({ error: err.message || 'Error interno durante el inicio de sesión' })
  }
}
