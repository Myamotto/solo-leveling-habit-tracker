import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/backend'

const AuthCtx = createContext({ session: null, signOut: null })
export const useAuth = () => useContext(AuthCtx)

// Sans Supabase (mode local) : pas de login. Avec Supabase : écran de connexion tant qu'il n'y a pas de session.
export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!supabase) return children
  if (session === undefined) return <div className="boot"><div className="boot-spinner" /></div>
  if (!session) return <Login />

  const signOut = () => supabase.auth.signOut()
  return <AuthCtx.Provider value={{ session, signOut }}>{children}</AuthCtx.Provider>
}

const ERRORS = {
  'Invalid login credentials': 'Email ou mot de passe incorrect.',
  'Email not confirmed': "Email pas encore confirmé : clique sur le lien reçu par email.",
  'User already registered': 'Ce compte existe déjà. Connecte-toi.',
}

function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const creds = { email: email.trim(), password }
    const { data, error } = mode === 'login'
      ? await supabase.auth.signInWithPassword(creds)
      : await supabase.auth.signUp({ ...creds, options: { emailRedirectTo: window.location.origin } })
    setBusy(false)
    if (error) return setMsg({ bad: true, text: ERRORS[error.message] || error.message })
    if (mode === 'signup' && !data.session) {
      setMode('login')
      setMsg({ text: 'Compte créé. Confirme ton email avec le lien reçu, puis connecte-toi.' })
    }
  }

  return (
    <div className="login">
      <div className="bg-glow" />
      <form className="login-card" onSubmit={submit}>
        <span className="brand-name">SOLO LEVELING</span>
        <h1 className="h-xl">{mode === 'login' ? 'Connexion' : 'Créer le compte'}</h1>
        <input type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input
          type="password" placeholder="Mot de passe" minLength={8} required value={password}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          onChange={(e) => setPassword(e.target.value)}
        />
        {msg && <p className={msg.bad ? 'login-msg bad' : 'login-msg'}>{msg.text}</p>}
        <button className="btn-mint" type="submit" disabled={busy}>
          {busy ? '…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
        </button>
        <button type="button" className="login-switch" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg(null) }}>
          {mode === 'login' ? 'Première fois ? Créer le compte' : "J'ai déjà un compte"}
        </button>
      </form>
    </div>
  )
}
