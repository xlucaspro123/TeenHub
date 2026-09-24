import { useState } from 'react'
import { supabase } from './supabaseClient'

export function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // 1. Autenticación tradicional por Correo / Contraseña
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username || email.split('@')[0],
            origin_hub: 'TeenHub Direct'
          },
          emailRedirectTo: `${window.location.origin}`
        }
      })

      if (error) setErrorMessage(error.message)
      else alert('¡Registro exitoso! Ya puedes iniciar sesión.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) setErrorMessage(error.message)
    }

    setLoading(false)
  }

  // 2. Autenticación mediante Lucasta Hub (OAuth 2.0)
  const handleLucastaLogin = () => {
    const state = Math.random().toString(36).substring(2, 15)
    sessionStorage.setItem('oauth_state', state)

    const redirectUri = encodeURIComponent(
      import.meta.env.DEV
        ? 'http://localhost:3000/api/auth/callback'
        : 'https://teenhub.vercel.app/api/auth/callback'
    )

    const authUrl = `https://lucastahub.vercel.app/oauth/authorize?client_id=teenshub&redirect_uri=${redirectUri}&response_type=code&state=${state}`

    window.location.href = authUrl
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-white p-4">
      <div className="w-full max-w-md bg-neutral-800 p-6 rounded-2xl shadow-xl border border-orange-500/30">
        <h2 className="text-2xl font-bold text-center text-orange-500 mb-1">
          {isSignUp ? 'Crear cuenta en TeenHub' : 'Iniciar Sesión'}
        </h2>
        <p className="text-xs text-neutral-400 text-center mb-6">
          Ecosistema conectado con <span className="text-orange-400 font-semibold">Lucasta Hub</span>
        </p>

        {/* Botón Principal: Lucasta Hub OAuth */}
        <button
          type="button"
          onClick={handleLucastaLogin}
          className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 font-bold py-3 px-4 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg mb-6"
        >
          <span>Continuar con Lucasta Hub</span>
        </button>

        {/* Separador visual */}
        <div className="relative flex py-2 items-center mb-6">
          <div className="flex-grow border-t border-neutral-700"></div>
          <span className="flex-shrink mx-4 text-xs text-neutral-500 uppercase">o usa tu correo</span>
          <div className="flex-grow border-t border-neutral-700"></div>
        </div>

        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 text-xs p-3 rounded-lg mb-4">
            {errorMessage}
          </div>
        )}

        {/* Formulario Tradicional */}
        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Nombre de Usuario</label>
              <input
                type="text"
                placeholder="Ej. LucasPro"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-neutral-700 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-neutral-400 mb-1">Correo Electrónico</label>
            <input
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-neutral-700 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1">Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-neutral-700 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neutral-700 hover:bg-neutral-600 font-bold py-3 rounded-xl transition duration-200 text-orange-400 border border-orange-500/40"
          >
            {loading ? 'Cargando...' : isSignUp ? 'Registrarme con Email' : 'Entrar con Email'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-orange-400 hover:underline"
          >
            {isSignUp ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate gratis'}
          </button>
        </div>
      </div>
    </div>
  )
}
