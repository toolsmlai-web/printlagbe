import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import type { User } from '@supabase/supabase-js'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [quoteDetails, setQuoteDetails] = useState('')

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription?.unsubscribe()
  }, [])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setMessage('Sign up successful! Check your email to confirm.')
      setEmail('')
      setPassword('')
    }
    setLoading(false)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setMessage('Signed in successfully!')
      setEmail('')
      setPassword('')
    }
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setQuoteDetails('')
  }

  const handleRequestQuote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setMessage('Please sign in first')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.rpc('create_quote_request', {
        p_user_id: user.id,
        p_details: quoteDetails,
      })

      if (error) {
        setMessage(`Error: ${error.message}`)
      } else {
        setMessage('Quote request submitted successfully!')
        setQuoteDetails('')
      }
    } catch (err) {
      setMessage(`Error: ${err}`)
    }
    setLoading(false)
  }

  return (
    <div className="container">
      <header>
        <h1>PrintLagbe</h1>
        <p>Motion Storefront & Quote Requests</p>
      </header>

      <main>
        {!user ? (
          <div className="auth-section">
            <h2>Welcome</h2>
            <form onSubmit={handleSignIn}>
              <div className="form-group">
                <label htmlFor="email">Email:</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password:</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="button-group">
                <button type="submit" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
                <button
                  type="button"
                  onClick={handleSignUp}
                  disabled={loading}
                  className="secondary"
                >
                  {loading ? 'Signing up...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="app-section">
            <div className="user-info">
              <p>Welcome, <strong>{user.email}</strong></p>
              <button onClick={handleSignOut} className="sign-out-btn">Sign Out</button>
            </div>

            <div className="quote-section">
              <h2>Request a Quote</h2>
              <form onSubmit={handleRequestQuote}>
                <div className="form-group">
                  <label htmlFor="details">Quote Details:</label>
                  <textarea
                    id="details"
                    value={quoteDetails}
                    onChange={(e) => setQuoteDetails(e.target.value)}
                    placeholder="Describe your motion printing needs..."
                    rows={6}
                    disabled={loading}
                    required
                  />
                </div>
                <button type="submit" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Quote Request'}
                </button>
              </form>
            </div>
          </div>
        )}

        {message && (
          <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
      </main>

      <footer>
        <p>&copy; 2026 PrintLagbe. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
