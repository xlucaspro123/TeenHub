import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Auth } from './Auth'

// ─── Theme shorthand ──────────────────────────────────────────────────────────
const th = {
  primary:       'var(--th-primary)',
  primaryDark:   'var(--th-primary-dark)',
  primaryDim:    'var(--th-primary-dim)',
  primaryFg:     'var(--th-primary-fg)',
  primaryGlow:   'var(--th-primary-glow)',
  primaryBorder: 'var(--th-primary-border)',
  bg:       'var(--bg)',
  bg2:      'var(--bg2)',
  card:     'var(--card)',
  cardSolid:'var(--card-solid)',
  card2:    'var(--card2)',
  border:   'var(--border)',
  border2:  'var(--border2)',
  text:     'var(--text)',
  textSub:  'var(--text-sub)',
  textMuted:'var(--text-muted)',
  textDim:  'var(--text-dim)',
  textFaint:'var(--text-faint)',
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface UserProfile {
  id: string
  displayName: string
  email: string
  avatarUrl?: string
  joinYear: number
  xp: number
  trades: number
  streak: number
  assists: number
}

interface LeaderboardEntry {
  rank: number
  userId: string
  displayName: string
  avatarEmoji: string
  xp: number
  subject: string
  deltaXp: string
  isCurrentUser?: boolean
}

interface TradePost {
  id: string
  userId: string
  displayName: string
  avatarEmoji: string
  offer: string
  want: string
  tradeCount: number
  isElite: boolean
  tags: string[]
  isOnline: boolean
  rating: number
  bio?: string
}

interface FeedPost {
  id: string
  userId: string
  displayName: string
  avatarEmoji: string
  isAnonymous: boolean
  text: string
  tags: string[]
  heartCount: number
  replyCount: number
  urgency: 'high' | 'medium' | 'low'
  createdAt: string
  comments: { author: string; text: string; time: string }[]
}

// ─── Liquid Glass card components ─────────────────────────────────────────────
function GlassCard({ children, style = {}, className = '', onClick }: {
  children: React.ReactNode; style?: React.CSSProperties; className?: string; onClick?: () => void
}) {
  return (
    <div className={`glass ${className}`} onClick={onClick} style={{
      borderRadius: 'var(--radius-card)',
      ...style,
    }}>{children}</div>
  )
}

function GlassCardOrange({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="glass-orange" style={{ borderRadius: 'var(--radius-card)', ...style }}>{children}</div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ icon, title, subtitle, cta, onCta }: {
  icon: string; title: string; subtitle: string; cta?: string; onCta?: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '52px 32px', gap: 12 }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 30, marginBottom: 4,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>{icon}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: th.text, textAlign: 'center' }}>{title}</div>
      <div style={{ fontSize: 13, color: th.textDim, textAlign: 'center', lineHeight: 1.6, maxWidth: 260 }}>{subtitle}</div>
      {cta && (
        <button onClick={onCta} style={{
          marginTop: 8, fontSize: 14, fontWeight: 800, fontFamily: 'Nunito, sans-serif',
          padding: '11px 28px', borderRadius: 50,
          background: `linear-gradient(135deg, ${th.primary}, ${th.primaryDark})`,
          color: th.primaryFg, border: 'none', cursor: 'pointer',
          boxShadow: `0 4px 20px ${th.primaryGlow}`,
        }}>{cta}</button>
      )}
    </div>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      width: 52, height: 28, borderRadius: 14, flexShrink: 0,
      background: on ? th.primary : 'rgba(255,255,255,0.08)',
      border: `1px solid ${on ? th.primary : 'rgba(255,255,255,0.12)'}`,
      cursor: 'pointer', position: 'relative', transition: 'all 0.22s',
      boxShadow: on ? `0 0 14px ${th.primaryGlow}` : 'none',
    }}>
      <div style={{
        position: 'absolute', top: 3, left: on ? 26 : 3,
        width: 22, height: 22, borderRadius: '50%',
        background: on ? '#fff' : 'rgba(255,255,255,0.5)',
        transition: 'left 0.22s',
        boxShadow: '0 1px 6px rgba(0,0,0,0.35)',
      }} />
    </button>
  )
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'profile',     label: 'Perfil',  icon: '👤' },
  { id: 'leaderboard', label: 'Tareas',  icon: '🏆' },
  { id: 'skills',      label: 'Trades',  icon: '🔄' },
  { id: 'problems',    label: 'Feed',    icon: '💬' },
  { id: 'settings',    label: 'Config',  icon: '⚙️' },
]

function BottomNav({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 430,
      background: 'rgba(8,11,18,0.80)',
      backdropFilter: 'blur(40px) saturate(200%)',
      WebkitBackdropFilter: 'blur(40px) saturate(200%)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '8px 4px 20px', zIndex: 100,
    }}>
      {NAV_ITEMS.map(({ id, label, icon }) => {
        const on = active === id
        return (
          <button key={id} onClick={() => onChange(id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            background: on ? 'rgba(249,115,22,0.14)' : 'transparent',
            border: `1px solid ${on ? 'rgba(249,115,22,0.3)' : 'transparent'}`,
            cursor: 'pointer', padding: '7px 14px', borderRadius: 16,
            transition: 'all 0.2s',
            backdropFilter: on ? 'blur(12px)' : 'none',
          }}>
            <span style={{ fontSize: 18, lineHeight: 1, filter: on ? 'none' : 'grayscale(40%) opacity(0.55)' }}>{icon}</span>
            <span style={{ fontSize: 10, fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: on ? th.primary : th.textDim, letterSpacing: '0.02em' }}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 1 — PROFILE
// ═══════════════════════════════════════════════════════════════════════════════
const FEELING_TAGS = [
  { label: 'Feliz',       emoji: '😊', clr: '#fbbf24' },
  { label: 'Triste',      emoji: '😢', clr: '#60a5fa' },
  { label: 'Enojado',     emoji: '😠', clr: '#f87171' },
  { label: 'Asustado',    emoji: '😨', clr: '#c084fc' },
  { label: 'Esperanzado', emoji: '🌟', clr: '#f97316' },
  { label: 'Ansioso',     emoji: '😰', clr: '#fb923c' },
  { label: 'Orgulloso',   emoji: '🦁', clr: '#facc15' },
  { label: 'Valiente',    emoji: '💪', clr: '#34d399' },
]

function ProfileScreen({ user, onOpenAuth }: { user: UserProfile | null; onOpenAuth: () => void }) {
  const [selectedFeeling, setSelectedFeeling] = useState<string | null>(null)
  const [thought, setThought] = useState('')
  const [focused, setFocused] = useState(false)

  return (
    <div style={{ paddingBottom: 110 }}>
      {/* Header */}
      <div style={{ position: 'relative', padding: '52px 22px 28px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Avatar + info */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 84, height: 84, borderRadius: '50%',
              background: user?.avatarUrl
                ? `url(${user.avatarUrl}) center/cover`
                : 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(20px)',
              border: `2.5px solid ${user ? th.primary : 'rgba(255,255,255,0.14)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 34,
              boxShadow: user
                ? `0 0 0 4px ${th.bg}, 0 0 22px ${th.primaryGlow}`
                : '0 0 0 4px rgba(255,255,255,0.04)',
            }}>
              {!user?.avatarUrl && '👤'}
            </div>
            {user && <div style={{ position: 'absolute', bottom: 4, right: 4, width: 15, height: 15, borderRadius: '50%', background: th.primary, border: `2.5px solid ${th.bg}`, boxShadow: `0 0 8px ${th.primary}` }} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 23, fontWeight: 900, color: user ? th.text : th.textDim, lineHeight: 1.1 }}>
              {user?.displayName ?? 'Tu nombre aquí'}
            </div>
            <div style={{ fontSize: 12, color: user ? th.primary : th.textDim, fontWeight: 700, marginTop: 4 }}>
              {user ? `Miembro desde ${user.joinYear}` : 'Sin sesión iniciada'}
            </div>
            {user ? (
              <div style={{ display: 'flex', gap: 7, marginTop: 8 }}>
                <span style={{ fontSize: 11, background: 'rgba(249,115,22,0.12)', backdropFilter: 'blur(8px)', color: th.primary, padding: '2px 10px', borderRadius: 20, fontWeight: 700, border: '1px solid rgba(249,115,22,0.25)' }}>✦ {user.xp} XP</span>
                <span style={{ fontSize: 11, background: 'rgba(96,165,250,0.10)', backdropFilter: 'blur(8px)', color: '#60a5fa', padding: '2px 10px', borderRadius: 20, fontWeight: 700, border: '1px solid rgba(96,165,250,0.2)' }}>{user.trades} trades</span>
              </div>
            ) : (
              <button onClick={onOpenAuth} style={{
                marginTop: 8, fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 12,
                background: th.primary, color: th.primaryFg, border: 'none', cursor: 'pointer'
              }}>
                Iniciar Sesión
              </button>
            )}
          </div>
        </div>

        {/* Thought box */}
        <div style={{ marginTop: 22 }}>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(24px)',
            border: `1px solid ${focused ? th.primary : 'rgba(255,255,255,0.10)'}`,
            borderRadius: 16, transition: 'border-color 0.2s',
            boxShadow: focused ? `0 0 0 3px rgba(249,115,22,0.12)` : 'none',
          }}>
            <textarea value={thought} onChange={e => setThought(e.target.value)}
              placeholder="¿Qué estás pensando ahora?"
              rows={2} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              style={{
                width: '100%', background: 'transparent',
                border: 'none', padding: '13px 16px',
                color: th.text, fontSize: 14, fontFamily: 'Nunito, sans-serif',
                resize: 'none', outline: 'none', lineHeight: 1.55,
              }} />
          </div>
        </div>
      </div>

      {/* Stats — only when logged in */}
      {user && (
        <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10 }}>
          {[
            { label: 'Racha',  value: `${user.streak} días`, clr: th.primary },
            { label: 'Ayudas', value: String(user.assists),   clr: '#34d399' },
            { label: 'Trades', value: String(user.trades),    clr: '#818cf8' },
          ].map(s => (
            <GlassCard key={s.label} style={{ flex: 1, padding: '13px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: s.clr, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: th.textDim, fontWeight: 600, marginTop: 3 }}>{s.label}</div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Feeling Tags */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: th.text, margin: 0 }}>¿Cómo te sientes hoy?</h2>
          <span style={{ fontSize: 10, color: th.textDim, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Feeling Tags</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
          {FEELING_TAGS.map(f => {
            const on = selectedFeeling === f.label
            return (
              <button key={f.label} onClick={() => setSelectedFeeling(on ? null : f.label)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: on ? `${f.clr}18` : 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: `1.5px solid ${on ? f.clr : 'rgba(255,255,255,0.09)'}`,
                borderRadius: 50, padding: '10px 16px',
                cursor: 'pointer', transition: 'all 0.18s', fontFamily: 'Nunito, sans-serif',
                boxShadow: on ? `0 0 16px ${f.clr}35, inset 0 1px 0 rgba(255,255,255,0.08)` : 'inset 0 1px 0 rgba(255,255,255,0.04)',
              }}>
                <span style={{ fontSize: 19 }}>{f.emoji}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: on ? f.clr : th.textMuted }}>{f.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 2 — LEADERBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function useCountdown() {
  const [time, setTime] = useState({ h: 47, m: 23, s: 11 })
  useEffect(() => {
    const id = setInterval(() => {
      setTime(p => {
        let { h, m, s } = p
        s--; if (s < 0) { s = 59; m-- } if (m < 0) { m = 59; h-- } if (h < 0) { h = 47; m = 59; s = 59 }
        return { h, m, s }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

const SUBJECT_FILTERS = ['Todos', 'Matemáticas', 'Ciencias', 'Historia', 'Idiomas']

function LeaderboardScreen() {
  const entries: LeaderboardEntry[] = []

  const { h, m, s } = useCountdown()
  const pad = (n: number) => String(n).padStart(2, '0')
  const [subjectIdx, setSubjectIdx] = useState(0)

  const top1 = entries[0] ?? null
  const silver = entries[1] ?? null
  const bronze = entries[2] ?? null
  const rest = entries.slice(3)

  const rankMetal: Record<number, string> = { 2: '#9ca3af', 3: '#cd7f32' }

  return (
    <div style={{ paddingBottom: 110 }}>
      <div style={{ position: 'relative', padding: '52px 22px 22px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.14) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ fontSize: 12, color: '#fbbf24', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Semana Actual</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 3px', color: th.text }}>Leaderboard</h1>
        <p style={{ fontSize: 13, color: th.textDim, margin: '0 0 18px' }}>Top ayudantes con tareas esta semana</p>

        <div style={{
          background: 'rgba(26,16,0,0.6)', backdropFilter: 'blur(30px)',
          border: '1px solid rgba(251,191,36,0.22)', borderRadius: 18,
          padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        }}>
          <div>
            <div style={{ fontSize: 10, color: '#d97706', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>⏱ Reinicio del ranking en</div>
            <div style={{ fontSize: 30, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: '#fbbf24', letterSpacing: '0.06em', marginTop: 3 }}>
              {pad(h)}<span style={{ color: '#d97706', fontSize: 22 }}>:</span>{pad(m)}<span style={{ color: '#d97706', fontSize: 22 }}>:</span>{pad(s)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: th.textDim, fontWeight: 600 }}>Tu posición</div>
            <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: th.primary }}>
              {entries.find(e => e.isCurrentUser) ? `#${entries.find(e => e.isCurrentUser)!.rank}` : '—'}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8, overflowX: 'auto' }}>
        {SUBJECT_FILTERS.map((f, i) => (
          <button key={f} onClick={() => setSubjectIdx(i)} style={{
            fontSize: 12, fontWeight: 700, fontFamily: 'Nunito, sans-serif',
            padding: '6px 16px', borderRadius: 20, whiteSpace: 'nowrap',
            background: subjectIdx === i ? th.primary : 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(16px)',
            color: subjectIdx === i ? th.primaryFg : th.textDim,
            border: `1px solid ${subjectIdx === i ? th.primary : 'rgba(255,255,255,0.09)'}`,
            cursor: 'pointer', transition: 'all 0.18s',
            boxShadow: subjectIdx === i ? `0 0 12px ${th.primaryGlow}` : 'none',
          }}>{f}</button>
        ))}
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon="🏆"
          title="Tabla de clasificación vacía"
          subtitle="Aún no hay ayudantes registrados esta semana. ¡Sé el primero en ganar XP ayudando con tareas!"
          cta="Ir al Feed y ayudar"
        />
      ) : (
        <>
          {top1 && (
            <div style={{ padding: '0 20px 14px' }}>
              <div style={{
                background: 'linear-gradient(140deg, rgba(42,32,0,0.90) 0%, rgba(20,14,0,0.95) 100%)',
                backdropFilter: 'blur(36px) saturate(180%)',
                WebkitBackdropFilter: 'blur(36px) saturate(180%)',
                border: '1.5px solid rgba(251,191,36,0.40)',
                borderRadius: 24, padding: '20px 20px 18px',
                position: 'relative', overflow: 'hidden',
                boxShadow: '0 8px 48px rgba(217,119,6,0.28), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #fbbf24, transparent)' }} />
                <div style={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.18) 0%, transparent 70%)' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #fbbf24, #b45309)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: '0 0 22px rgba(251,191,36,0.55)' }}>{top1.avatarEmoji}</div>
                    <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', fontSize: 16 }}>👑</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: '#d97706', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>#1 · Maestro de la Semana</div>
                    <div style={{ fontSize: 21, fontWeight: 900, color: '#fef3c7', marginTop: 3 }}>{top1.displayName}</div>
                    <div style={{ fontSize: 12, color: '#d97706', fontWeight: 600, marginTop: 2 }}>{top1.subject}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: '#fbbf24', lineHeight: 1 }}>{top1.xp}</div>
                    <div style={{ fontSize: 11, color: '#d97706', fontWeight: 700 }}>XP</div>
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: '#d97706', fontWeight: 700 }}>Progreso semanal</span>
                    <span style={{ fontSize: 10, color: '#fbbf24', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{top1.xp} / 1000 XP</span>
                  </div>
                  <div style={{ height: 5, background: 'rgba(251,191,36,0.15)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(top1.xp / 10, 100)}%`, background: 'linear-gradient(90deg, #fbbf24, #d97706)', borderRadius: 3, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {(silver || bronze) && (
            <div style={{ padding: '0 20px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[silver, bronze].filter(Boolean).map((u) => u && (
                <GlassCard key={u.rank} style={{ padding: '14px', border: `1.5px solid ${rankMetal[u.rank]}35`, boxShadow: `0 2px 20px ${rankMetal[u.rank]}18` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: `${rankMetal[u.rank]}18`, border: `1.5px solid ${rankMetal[u.rank]}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19 }}>{u.avatarEmoji}</div>
                    <span style={{ fontSize: 18, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: rankMetal[u.rank] }}>#{u.rank}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: th.text, marginBottom: 2 }}>{u.displayName}</div>
                  <div style={{ fontSize: 11, color: th.textDim, marginBottom: 8 }}>{u.subject}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: rankMetal[u.rank] }}>{u.xp} <span style={{ fontSize: 10 }}>XP</span></span>
                    <span style={{ fontSize: 10, color: '#34d399', fontWeight: 700, background: 'rgba(52,211,153,0.10)', padding: '2px 7px', borderRadius: 8 }}>{u.deltaXp}</span>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          {rest.length > 0 && (
            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {rest.map(u => (
                <GlassCard key={u.rank} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 14px',
                  background: u.isCurrentUser ? 'rgba(249,115,22,0.10)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${u.isCurrentUser ? th.primaryBorder : 'rgba(255,255,255,0.09)'}`,
                }}>
                  <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: u.isCurrentUser ? th.primary : th.textDim, fontWeight: 700, width: 22, textAlign: 'center' }}>#{u.rank}</span>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{u.avatarEmoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: u.isCurrentUser ? th.primary : th.textSub }}>{u.displayName}{u.isCurrentUser && <span style={{ fontSize: 9, marginLeft: 6, color: th.primary, background: 'rgba(249,115,22,0.12)', padding: '1px 6px', borderRadius: 8 }}>TÚ</span>}</div>
                    <div style={{ fontSize: 11, color: th.textDim }}>{u.subject}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: u.isCurrentUser ? th.primary : th.textMuted }}>{u.xp} <span style={{ fontSize: 10, fontWeight: 600 }}>XP</span></div>
                    <div style={{ fontSize: 10, color: '#34d399', fontWeight: 700 }}>{u.deltaXp}</div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 3 — SKILL SWAPPER
// ═══════════════════════════════════════════════════════════════════════════════
const TRADE_FILTERS = ['Todos', 'Ciencias', 'Tech', 'Arte', 'Letras']

function SkillsScreen() {
  const trades: TradePost[] = []

  const [filterIdx, setFilterIdx] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div style={{ paddingBottom: 110 }}>
      <div style={{ position: 'relative', padding: '52px 22px 22px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle, ${th.primaryGlow} 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ fontSize: 12, color: th.primary, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Tablón de Intercambios</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 3px', color: th.text }}>Skill Swapper</h1>
        <p style={{ fontSize: 13, color: th.textDim, margin: '0 0 16px' }}>Intercambia habilidades con otros teens</p>

        <button style={{
          width: '100%', padding: '13px 16px',
          background: 'rgba(249,115,22,0.08)',
          backdropFilter: 'blur(20px)',
          border: `1.5px dashed ${th.primaryBorder}`,
          borderRadius: 16, display: 'flex', alignItems: 'center', gap: 10,
          cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>
          <span style={{ fontSize: 20 }}>➕</span>
          <span style={{ fontSize: 14, color: th.primary, fontWeight: 700 }}>Publicar un intercambio...</span>
        </button>
      </div>

      <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8, overflowX: 'auto' }}>
        {TRADE_FILTERS.map((f, i) => (
          <button key={f} onClick={() => setFilterIdx(i)} style={{
            fontSize: 12, fontWeight: 700, fontFamily: 'Nunito, sans-serif',
            padding: '6px 16px', borderRadius: 20, whiteSpace: 'nowrap',
            background: filterIdx === i ? th.primary : 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(16px)',
            color: filterIdx === i ? th.primaryFg : th.textDim,
            border: `1px solid ${filterIdx === i ? th.primary : 'rgba(255,255,255,0.09)'}`,
            cursor: 'pointer', transition: 'all 0.18s',
            boxShadow: filterIdx === i ? `0 0 12px ${th.primaryGlow}` : 'none',
          }}>{f}</button>
        ))}
      </div>

      {trades.length === 0 ? (
        <EmptyState
          icon="🔄"
          title="Aún no hay intercambios"
          subtitle="¡Sé el primero en publicar lo que ofreces y lo que buscas! La comunidad está esperando."
          cta="Publicar mi primer trade"
        />
      ) : (
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {trades.map(tr => {
            const open = expanded === tr.id
            return (
              <GlassCard key={tr.id} style={{
                padding: 18,
                border: `1.5px solid ${tr.isElite ? th.primaryBorder : 'rgba(255,255,255,0.09)'}`,
                boxShadow: tr.isElite ? `0 0 28px ${th.primaryGlow}, inset 0 1px 0 rgba(255,255,255,0.07)` : 'inset 0 1px 0 rgba(255,255,255,0.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: tr.isElite ? `linear-gradient(135deg, ${th.primary}, ${th.primaryDark})` : 'rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(12px)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                      border: `1.5px solid ${tr.isElite ? th.primary : 'rgba(255,255,255,0.10)'}`,
                      boxShadow: tr.isElite ? `0 0 0 3px ${th.bg}, 0 0 0 5px ${th.primary}` : 'none',
                    }}>{tr.avatarEmoji}</div>
                    {tr.isOnline && <div style={{ position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: '50%', background: th.primary, border: `2.5px solid ${th.bg}` }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: th.text }}>{tr.displayName}</span>
                      {tr.isElite && <span style={{ fontSize: 9, fontWeight: 900, background: `linear-gradient(135deg, ${th.primary}, ${th.primaryDark})`, color: th.primaryFg, padding: '2px 7px', borderRadius: 20, letterSpacing: '0.04em' }}>★ ÉLITE</span>}
                    </div>
                    <div style={{ fontSize: 11, color: th.textDim, marginTop: 2 }}>{tr.tradeCount} intercambios · {'★'.repeat(Math.floor(tr.rating))} {tr.rating}</div>
                  </div>
                  <button onClick={() => setExpanded(open ? null : tr.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: th.textDim }}>
                    {open ? '▲' : '▼'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px 1fr', gap: 6, alignItems: 'center' }}>
                  <GlassCardOrange style={{ padding: '10px 12px', borderRadius: 12 }}>
                    <div style={{ fontSize: 9, color: th.primary, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Ofrezco</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: th.text }}>{tr.offer}</div>
                  </GlassCardOrange>
                  <div style={{ textAlign: 'center', fontSize: 15, color: th.textDim }}>⇄</div>
                  <div style={{ background: 'rgba(96,165,250,0.08)', backdropFilter: 'blur(16px)', border: '1px solid rgba(96,165,250,0.22)', borderRadius: 12, padding: '10px 12px' }}>
                    <div style={{ fontSize: 9, color: '#60a5fa', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Busco</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: th.text }}>{tr.want}</div>
                  </div>
                </div>

                {open && tr.bio && (
                  <div style={{ marginTop: 12, padding: 12, background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p style={{ fontSize: 12, color: th.textMuted, margin: '0 0 8px', lineHeight: 1.6 }}>{tr.bio}</p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {tr.tags.map(tag => <span key={tag} style={{ fontSize: 10, background: 'rgba(255,255,255,0.06)', color: th.textDim, padding: '3px 9px', borderRadius: 20, fontWeight: 700 }}>{tag}</span>)}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
                  <div style={{ flex: 1, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {tr.tags.slice(0, 2).map(tag => <span key={tag} style={{ fontSize: 10, background: 'rgba(255,255,255,0.06)', color: th.textDim, padding: '3px 8px', borderRadius: 20, fontWeight: 600 }}>{tag}</span>)}
                  </div>
                  <button style={{
                    fontSize: 13, fontWeight: 800, fontFamily: 'Nunito, sans-serif',
                    padding: '9px 20px', borderRadius: 20, whiteSpace: 'nowrap',
                    background: `linear-gradient(135deg, ${th.primary}, ${th.primaryDark})`,
                    color: th.primaryFg, border: 'none', cursor: 'pointer',
                    boxShadow: `0 2px 14px ${th.primaryGlow}`,
                  }}>Intercambiar →</button>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 4 — PROBLEM SHARER / FEED
// ═══════════════════════════════════════════════════════════════════════════════
const FEED_FILTERS = ['Recientes', 'Populares', 'Sin respuesta', 'Seguidos']

function ProblemsScreen() {
  const posts: FeedPost[] = []

  const [filterIdx, setFilterIdx] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [liked, setLiked] = useState<Set<string>>(new Set())

  const urgClr = (u: string) => u === 'high' ? '#f87171' : u === 'medium' ? th.primary : '#34d399'

  return (
    <div style={{ paddingBottom: 110 }}>
      <div style={{ position: 'relative', padding: '52px 22px 22px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(192,132,252,0.13) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ fontSize: 12, color: '#c084fc', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Muro Seguro</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 3px', color: th.text }}>Problem Sharer</h1>
        <p style={{ fontSize: 13, color: th.textDim, margin: '0 0 16px' }}>Comparte situaciones · recibe apoyo sin juicios</p>

        <button style={{
          width: '100%', padding: '13px 16px',
          background: 'rgba(192,132,252,0.08)',
          backdropFilter: 'blur(20px)',
          border: '1.5px dashed rgba(192,132,252,0.30)',
          borderRadius: 16, display: 'flex', alignItems: 'center', gap: 10,
          cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>
          <span style={{ fontSize: 20 }}>✍️</span>
          <span style={{ fontSize: 14, color: '#c084fc', fontWeight: 700 }}>Compartir algo que me pesa...</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: th.textDim, fontWeight: 600 }}>Anónimo ✓</span>
        </button>
      </div>

      <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8, overflowX: 'auto' }}>
        {FEED_FILTERS.map((f, i) => (
          <button key={f} onClick={() => setFilterIdx(i)} style={{
            fontSize: 12, fontWeight: 700, fontFamily: 'Nunito, sans-serif',
            padding: '6px 16px', borderRadius: 20, whiteSpace: 'nowrap',
            background: filterIdx === i ? 'rgba(192,132,252,0.18)' : 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(16px)',
            color: filterIdx === i ? '#c084fc' : th.textDim,
            border: `1px solid ${filterIdx === i ? 'rgba(192,132,252,0.40)' : 'rgba(255,255,255,0.09)'}`,
            cursor: 'pointer', transition: 'all 0.18s',
          }}>{f}</button>
        ))}
      </div>

      {posts.length === 0 ? (
        <EmptyState
          icon="💬"
          title="El muro está vacío"
          subtitle="Aún no hay publicaciones esta semana. Comparte algo que te pese — aquí nadie juzga y siempre hay alguien dispuesto a escuchar."
          cta="Compartir algo"
        />
      ) : (
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {posts.map(p => {
            const open = expanded === p.id
            const heart = liked.has(p.id)
            const clr = urgClr(p.urgency)

            return (
              <GlassCard key={p.id} style={{ overflow: 'hidden', position: 'relative', padding: 0 }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3.5, background: clr, borderRadius: '3px 0 0 3px' }} />
                <div style={{ padding: '16px 16px 14px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', border: `1.5px solid ${clr}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>{p.avatarEmoji}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: th.textSub }}>{p.isAnonymous ? 'Anónimo' : p.displayName}</div>
                        <div style={{ fontSize: 10, color: th.textDim }}>{p.createdAt}</div>
                      </div>
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: clr, boxShadow: `0 0 6px ${clr}` }} />
                  </div>

                  <p style={{ fontSize: 14, color: 'rgba(200,208,219,0.92)', lineHeight: 1.65, margin: '0 0 12px' }}>{p.text}</p>

                  <div style={{ display: 'flex', gap: 6, marginBottom: 13, flexWrap: 'wrap' }}>
                    {p.tags.map(tag => <span key={tag} style={{ fontSize: 10, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', color: th.textDim, padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>#{tag}</span>)}
                  </div>

                  <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                    <button onClick={() => setExpanded(open ? null : p.id)} style={{
                      flex: 1, fontSize: 13, fontWeight: 800, fontFamily: 'Nunito, sans-serif',
                      padding: '10px 8px', borderRadius: 12,
                      background: `linear-gradient(135deg, ${th.primary}, ${th.primaryDark})`,
                      color: th.primaryFg, border: 'none', cursor: 'pointer',
                      boxShadow: `0 2px 14px ${th.primaryGlow}`,
                    }}>💬 Dejar un consejo</button>
                    <button onClick={() => { const s = new Set(liked); heart ? s.delete(p.id) : s.add(p.id); setLiked(s) }} style={{
                      fontSize: 13, fontWeight: 800, fontFamily: 'Nunito, sans-serif',
                      padding: '10px 13px', borderRadius: 12,
                      background: heart ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.06)',
                      backdropFilter: 'blur(12px)',
                      color: heart ? '#f87171' : th.textDim,
                      border: `1px solid ${heart ? 'rgba(248,113,113,0.35)' : 'rgba(255,255,255,0.09)'}`,
                      cursor: 'pointer', transition: 'all 0.18s',
                    }}>❤️ {p.heartCount + (heart ? 1 : 0)}</button>
                    <button style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Nunito, sans-serif', padding: '10px 13px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', color: th.textDim, border: '1px solid rgba(255,255,255,0.09)', cursor: 'pointer' }}>
                      💬 {p.replyCount}
                    </button>
                  </div>

                  {open && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 -4px 12px' }} />
                      {p.comments.map((c, ci) => (
                        <div key={ci} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>💬</div>
                          <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', borderRadius: 10, padding: '9px 12px', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 800, color: th.primary }}>{c.author}</span>
                              <span style={{ fontSize: 10, color: th.textDim }}>{c.time}</span>
                            </div>
                            <p style={{ fontSize: 12, color: th.textMuted, margin: 0, lineHeight: 1.5 }}>{c.text}</p>
                          </div>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                        <input placeholder="Escribe un consejo..." style={{
                          flex: 1, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)',
                          border: '1px solid rgba(255,255,255,0.10)', borderRadius: 20,
                          padding: '9px 14px', color: th.text, fontSize: 12,
                          fontFamily: 'Nunito, sans-serif', outline: 'none',
                        }} />
                        <button style={{ width: 34, height: 34, borderRadius: '50%', background: th.primary, border: 'none', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 10px ${th.primaryGlow}` }}>↑</button>
                      </div>
                    </div>
                  )}
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 5 — SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════
function SettingsScreen({ user, onOpenAuth, onLogout }: {
  user: UserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}) {
  const [tog, setTog] = useState({ nightDisconnect: true, notifications: true, privateMode: false, twoFactor: false, dataSharing: false })
  const flip = (k: keyof typeof tog) => setTog(p => ({ ...p, [k]: !p[k] }))

  return (
    <div style={{ paddingBottom: 110 }}>
      <div style={{ padding: '52px 22px 24px' }}>
        <div style={{ fontSize: 12, color: th.primary, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Configuración</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: th.text }}>Ajustes y Privacidad</h1>
      </div>

      {/* Profile card */}
      <div style={{ padding: '0 20px 18px' }}>
        <GlassCard style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 50, height: 50, borderRadius: '50%',
            background: user ? `linear-gradient(135deg, ${th.primary}, ${th.primaryDark})` : 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            border: `2px solid ${user ? th.primary : 'rgba(255,255,255,0.12)'}`,
            boxShadow: user ? `0 0 0 3px ${th.bg}, 0 0 14px ${th.primaryGlow}` : 'none',
          }}>{user ? '🧑‍💻' : '👤'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: user ? th.text : th.textDim }}>{user?.displayName ?? 'Sin sesión iniciada'}</div>
            <div style={{ fontSize: 12, color: user ? th.primary : th.textDim, fontWeight: 600 }}>{user?.email ?? 'Conecta tu cuenta para comenzar'}</div>
          </div>
          {user && (
            <button onClick={onLogout} style={{
              fontSize: 11, fontWeight: 800, background: 'rgba(248,113,113,0.15)', color: '#f87171',
              border: '1px solid rgba(248,113,113,0.3)', padding: '6px 12px', borderRadius: 12, cursor: 'pointer'
            }}>
              Salir
            </button>
          )}
        </GlassCard>
      </div>

      {/* Night disconnect */}
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{
          background: 'rgba(20,12,0,0.70)',
          backdropFilter: 'blur(36px) saturate(180%)',
          WebkitBackdropFilter: 'blur(36px) saturate(180%)',
          border: `1.5px solid ${th.primaryBorder}`,
          borderRadius: 22, padding: 18,
          boxShadow: `0 4px 32px ${th.primaryGlow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, marginRight: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>🌙</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: th.text }}>Desconexión Agendada</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: th.primary, marginBottom: 4 }}>Nocturna: 23:00 – 07:00</div>
              <p style={{ fontSize: 12, color: th.textDim, margin: 0, lineHeight: 1.55 }}>TeensHub pausa notificaciones de noche para proteger tu descanso y salud mental.</p>
            </div>
            <Toggle on={tog.nightDisconnect} onToggle={() => flip('nightDisconnect')} />
          </div>
          {tog.nightDisconnect && (
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {[['23:00', 'Inicio'], ['07:00', 'Fin']].map(([val, lbl]) => (
                <div key={lbl} style={{ flex: 1, background: 'rgba(249,115,22,0.08)', backdropFilter: 'blur(12px)', border: `1px solid ${th.primaryBorder}`, borderRadius: 12, padding: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'JetBrains Mono, monospace', color: th.primary }}>{val}</div>
                  <div style={{ fontSize: 10, color: th.textDim, fontWeight: 600 }}>{lbl}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toggle list */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          { key: 'notifications', icon: '🔔', label: 'Notificaciones',            sub: 'Alertas de ayuda y trades' },
          { key: 'privateMode',   icon: '👁️',  label: 'Modo Privado',             sub: 'Solo amigos ven tu perfil' },
          { key: 'twoFactor',     icon: '🔐', label: 'Verificación en dos pasos', sub: 'Mayor seguridad en tu cuenta' },
          { key: 'dataSharing',   icon: '📊', label: 'Datos Anónimos',            sub: 'Ayuda a mejorar TeensHub' },
        ].map(item => (
          <GlassCard key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: th.textSub }}>{item.label}</div>
                <div style={{ fontSize: 11, color: th.textDim, fontWeight: 500 }}>{item.sub}</div>
              </div>
            </div>
            <Toggle on={tog[item.key as keyof typeof tog]} onToggle={() => flip(item.key as keyof typeof tog)} />
          </GlassCard>
        ))}
      </div>

      {/* Privacy note */}
      <div style={{ padding: '14px 20px' }}>
        <GlassCard style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
            <p style={{ fontSize: 11, color: th.textDim, lineHeight: 1.65, margin: 0 }}>
              <strong style={{ color: th.textMuted }}>Privacidad & Encriptación:</strong> Tu información está protegida con cifrado AES-256 de extremo a extremo. Tus sentimientos y conversaciones <strong style={{ color: th.textMuted }}>jamás son vendidos</strong> a terceros. Cumplimos COPPA y GDPR para menores de edad.
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Auth trigger */}
      {!user && (
        <div style={{ padding: '0 20px 12px' }}>
          <button onClick={onOpenAuth} style={{
            width: '100%', padding: 15,
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(28px) saturate(160%)',
            border: `1.5px solid ${th.primaryBorder}`,
            borderRadius: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: 'Nunito, sans-serif',
            boxShadow: `0 0 24px ${th.primaryGlow}, inset 0 1px 0 rgba(255,255,255,0.08)`,
            transition: 'box-shadow 0.2s',
          }}>
            <span style={{ fontSize: 20 }}>🔑</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: th.primary }}>Iniciar sesión / Registrarse</span>
          </button>
        </div>
      )}

      <div style={{ padding: '8px 20px 20px', textAlign: 'center' }}>
        <span style={{ fontSize: 11, color: th.textFaint, fontWeight: 600 }}>TeensHub v1.0.0 · Hecho con 🧡 para jóvenes</span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP SHELL
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState('profile')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    // 1. Verificar sesión existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserProfile({
          id: session.user.id,
          displayName: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'Usuario',
          email: session.user.email || '',
          avatarUrl: session.user.user_metadata?.avatar_url,
          joinYear: new Date(session.user.created_at).getFullYear(),
          xp: 150,
          trades: 3,
          streak: 5,
          assists: 8,
        })
      }
    })

    // 2. Escuchar cambios de autenticación en tiempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserProfile({
          id: session.user.id,
          displayName: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'Usuario',
          email: session.user.email || '',
          avatarUrl: session.user.user_metadata?.avatar_url,
          joinYear: new Date(session.user.created_at).getFullYear(),
          xp: 150,
          trades: 3,
          streak: 5,
          assists: 8,
        })
        setShowAuthModal(false)
      } else {
        setUserProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUserProfile(null)
  }

  const screens: Record<string, JSX.Element> = {
    profile:     <ProfileScreen user={userProfile} onOpenAuth={() => setShowAuthModal(true)} />,
    leaderboard: <LeaderboardScreen />,
    skills:      <SkillsScreen />,
    problems:    <ProblemsScreen />,
    settings:    <SettingsScreen user={userProfile} onOpenAuth={() => setShowAuthModal(true)} onLogout={handleLogout} />,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', justifyContent: 'center' }}>
      {/* Ambient background glows */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.05) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: '20%', left: '20%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(96,165,250,0.04) 0%, transparent 65%)' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 430, minHeight: '100vh', background: 'rgba(8,11,18,0.95)', position: 'relative', overflowX: 'hidden', zIndex: 1 }}>
        {/* Brand bar — liquid glass */}
        <div style={{
          position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 430,
          padding: '11px 20px',
          background: 'rgba(8,11,18,0.75)',
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          zIndex: 50,
          boxShadow: '0 1px 0 rgba(255,255,255,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9,
              background: `linear-gradient(135deg, ${th.primary}, ${th.primaryDark})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 900, color: th.primaryFg,
              boxShadow: `0 0 12px ${th.primaryGlow}`,
            }}>T</div>
            <span style={{ fontSize: 17, fontWeight: 900, color: th.text }}>TeensHub</span>
          </div>
          <span style={{ fontSize: 10, color: th.textDim, fontWeight: 600, fontStyle: 'italic' }}>Por jóvenes, de jóvenes, para jóvenes</span>
        </div>

        <div style={{ paddingTop: 52 }}>
          {showAuthModal ? (
            <div style={{ position: 'relative', zIndex: 60 }}>
              <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowAuthModal(false)} style={{ background: 'rgba(255,255,255,0.1)', color: th.text, border: 'none', padding: '6px 14px', borderRadius: 12, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                  ✕ Volver a la App
                </button>
              </div>
              <Auth />
            </div>
          ) : (
            screens[screen]
          )}
        </div>

        {!showAuthModal && <BottomNav active={screen} onChange={setScreen} />}
      </div>
    </div>
  )
}
