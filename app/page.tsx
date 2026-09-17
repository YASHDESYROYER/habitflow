'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

const accentOptions = [
  { name: 'Emerald', value: '#28c58b' },
  { name: 'Blue', value: '#4d8dff' },
  { name: 'Purple', value: '#9b7bff' },
  { name: 'Orange', value: '#ff9b52' },
  { name: 'Pink', value: '#f477ad' },
]

const seedHabits = [
  { id: 1, name: 'Go to the gym', icon: '🏋️', category: 'Fitness', color: '#28c58b', streak: 12, best: 24, progress: 93, days: [true, true, true, true, true, true, true, true, true, false, true, true, true, true, true, true, true, true, false, true, true, true, true, true, true, false, true, true, true, true] },
  { id: 2, name: 'Drink 2L water', icon: '💧', category: 'Health', color: '#5a9df8', streak: 8, best: 17, progress: 87, days: [true, true, false, true, true, true, true, true, true, true, false, true, true, true, true, true, true, true, true, false, true, true, true, true, true, true, false, true, true, true] },
  { id: 3, name: 'Read & meditate', icon: '🧘', category: 'Personal', color: '#a580ed', streak: 5, best: 13, progress: 78, days: [true, false, true, true, true, false, true, true, true, true, false, true, true, true, false, true, true, true, true, false, true, true, true, false, true, true, true, false, true, true] },
  { id: 4, name: 'Study for 2 hours', icon: '📚', category: 'Study', color: '#ed9b56', streak: 3, best: 10, progress: 72, days: [true, true, false, true, false, true, true, false, true, true, true, false, true, true, true, false, true, true, false, true, true, false, true, true, false, true, true, false, true, true] },
]

function getInitials(name: string) { return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() }

export default function Page() {
  const [habits, setHabits] = useState(seedHabits)
  const [accent, setAccent] = useState('#28c58b')
  const [dark, setDark] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [newHabit, setNewHabit] = useState({ name: '', icon: '✦', category: 'Health' })
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [showAuth, setShowAuth] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [syncing, setSyncing] = useState(false)

  const totalDays = habits.length * 30
  const completedDays = habits.reduce((sum, habit) => sum + habit.days.filter(Boolean).length, 0)
  const completion = Math.round((completedDays / totalDays) * 100)
  const todayCompleted = habits.filter((habit) => habit.days[13]).length
  const allToday = todayCompleted === habits.length
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const dates = Array.from({ length: 30 }, (_, index) => index + 1)
  const chartPoints = useMemo(() => [62, 70, 58, 78, 72, 86, 82, 92, 88, 95, 90, 96, 93, 100], [])

  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      const session = data.session
      setUserEmail(session?.user.email ?? null)
      if (session) {
        const { data: saved } = await supabase.from('habit_data').select('data').eq('user_id', session.user.id).maybeSingle()
        if (saved?.data) {
          setHabits(saved.data.habits ?? seedHabits)
          setAccent(saved.data.accent ?? '#28c58b')
          setDark(saved.data.dark ?? true)
        }
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUserEmail(session?.user.email ?? null))
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  async function syncData(nextHabits = habits, nextAccent = accent, nextDark = dark) {
    if (!supabase || !userEmail) return
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user
    if (!user) return
    setSyncing(true)
    await supabase.from('habit_data').upsert({ user_id: user.id, data: { habits: nextHabits, goals: [], accent: nextAccent, dark: nextDark }, updated_at: new Date().toISOString() })
    setSyncing(false)
  }

  async function submitAuth() {
    if (!supabase) { setAuthMessage('Supabase is not configured yet.'); return }
    setAuthMessage('')
    const result = authMode === 'sign-in'
      ? await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
      : await supabase.auth.signUp({ email: authEmail, password: authPassword })
    if (result.error) setAuthMessage(result.error.message)
    else {
      setUserEmail(result.data.user?.email ?? authEmail)
      setShowAuth(false)
      setAuthMessage(authMode === 'sign-up' ? 'Check your email to confirm your account.' : '')
    }
  }

  function toggleHabit(habitId: number, day: number) {
    setHabits((current) => {
      const next = current.map((habit) => habit.id === habitId ? { ...habit, days: habit.days.map((value, index) => index === day ? !value : value) } : habit)
      void syncData(next)
      return next
    })
  }

  function addHabit() {
    if (!newHabit.name.trim()) return
    setHabits((current) => {
      const next = [...current, { id: Date.now(), name: newHabit.name, icon: newHabit.icon || '✦', category: newHabit.category, color: accent, streak: 0, best: 0, progress: 0, days: Array(30).fill(false) }]
      void syncData(next)
      return next
    })
    setNewHabit({ name: '', icon: '✦', category: 'Health' })
    setShowModal(false)
  }

  return (
    <main className={dark ? 'app dark' : 'app'} style={{ '--accent': accent } as React.CSSProperties}>
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">✦</span><span>HabitFlow</span></div>
        <div className="workspace"><div className="avatar">{getInitials('Alex Morgan')}</div><div><strong>Alex Morgan</strong><span>Personal workspace</span></div><span className="dots">•••</span></div>
        <nav className="side-nav" aria-label="Main navigation">
          {['Dashboard', 'Calendar', 'Statistics', 'Goals'].map((item, index) => <button className={activeTab === item ? 'active' : ''} onClick={() => setActiveTab(item)} key={item}><span className="nav-icon">{['⌂', '□', '◒', '◎'][index]}</span>{item}<span className="nav-arrow">›</span></button>)}
        </nav>
        <div className="sidebar-bottom"><button className="" onClick={() => setShowSettings(true)}><span className="nav-icon">⚙</span>Settings</button><div className="tip"><span>✦</span><div><strong>Small steps.</strong><p>Big results.</p></div><button>×</button></div><div className="side-footer">HabitFlow v1.0.0<br /><span>Made for consistency</span></div></div>
      </aside>

      <section className="content">
        <header className="topbar"><div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{activeTab}</strong></div><div className="header-actions"><span className="sync-status">{syncing ? 'Saving…' : userEmail ? `Synced as ${userEmail}` : 'Local mode'}</span><button className="auth-button" onClick={async () => userEmail ? await supabase?.auth.signOut() : setShowAuth(true)}>{userEmail ? 'Sign out' : 'Sign in'}</button><button className="icon-button" aria-label="Toggle theme" onClick={() => { setDark(!dark); void syncData(habits, accent, !dark) }}>{dark ? '☼' : '☾'}</button><button className="icon-button" aria-label="Notifications">♧</button><button className="add-button" onClick={() => setShowModal(true)}><span>+</span> Add habit</button></div></header>

        {activeTab === 'Dashboard' ? <>
          <section className="hero"><div><p className="eyebrow">THURSDAY, SEPTEMBER 14, 2026</p><h1>Good morning, Alex <span>✦</span></h1><p className="hero-copy">You&apos;re building something great. Keep your rhythm going.</p></div><button className="month-picker">September 2026 <span>⌄</span></button></section>
          <section className="stats-grid"><div className="stat-card accent-card"><div className="stat-label">AVG. COMPLETION RATE <span className="info">i</span></div><div className="stat-value">{completion}<small>%</small></div><div className="stat-foot"><span className="trend">↗ 4.2%</span> vs last month <div className="mini-bars">{[4, 7, 5, 8, 6, 9, 7, 10, 8, 12, 10, 13].map((height, i) => <i key={i} style={{ height: `${height * 2}px`, opacity: i === 11 ? 1 : .35 }} />)}</div></div></div><div className="stat-card"><div className="stat-label">CURRENT STREAK <span className="info">i</span></div><div className="stat-value">12 <small>days</small></div><div className="stat-foot">Personal best <strong>24 days</strong><span className="streak-flame">♨</span></div></div><div className="stat-card"><div className="stat-label">COMPLETED TODAY <span className="info">i</span></div><div className="stat-value">{todayCompleted}<small> / {habits.length}</small></div><div className="stat-foot"><div className="tiny-progress"><span style={{ width: `${habits.length ? (todayCompleted / habits.length) * 100 : 0}%` }} /></div><span>{Math.round((todayCompleted / (habits.length || 1)) * 100)}%</span></div></div><div className="stat-card"><div className="stat-label">TOTAL HABITS <span className="info">i</span></div><div className="stat-value">{habits.length}<small> active</small></div><div className="stat-foot"><span className="live-dot" /> All systems on track</div></div></section>

          <section className="chart-grid"><div className="panel chart-panel"><div className="panel-heading"><div><h2>Completion overview</h2><p>Your consistency over the last 14 days</p></div><button className="select-button">Last 14 days <span>⌄</span></button></div><div className="line-chart"><div className="y-labels"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div><div className="chart-area"><div className="grid-lines" /> <svg viewBox="0 0 700 210" preserveAspectRatio="none" aria-label="Completion overview chart"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={accent} stopOpacity=".28" /><stop offset="100%" stopColor={accent} stopOpacity="0" /></linearGradient></defs><path d={`M 0 ${210 - chartPoints[0] * 1.8} ${chartPoints.map((point, i) => `L ${(i / 13) * 700} ${210 - point * 1.8}`).join(' ')} L 700 210 L 0 210 Z`} fill="url(#chartFill)" /><path d={`M 0 ${210 - chartPoints[0] * 1.8} ${chartPoints.map((point, i) => `L ${(i / 13) * 700} ${210 - point * 1.8}`).join(' ')}`} fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{chartPoints.map((point, i) => <circle key={i} cx={(i / 13) * 700} cy={210 - point * 1.8} r={i === 13 ? 5 : 3} fill={accent} stroke="currentColor" strokeWidth="2" />)}</svg><div className="x-labels">{['Sep 1', 'Sep 3', 'Sep 5', 'Sep 7', 'Sep 9', 'Sep 11', 'Sep 13', 'Today'].map((label) => <span key={label}>{label}</span>)}</div></div></div></div><div className="panel donut-panel"><div className="panel-heading"><div><h2>Monthly progress</h2><p>September 2026</p></div><button className="more-button">•••</button></div><div className="donut-wrap"><div className="donut" style={{ background: `conic-gradient(${accent} ${completion * 3.6}deg, var(--track) 0)` }}><div><strong>{completedDays}</strong><span>/ {totalDays}</span><small>completed</small></div></div><div className="legend"><span><i style={{ background: accent }} />Completed <b>{completedDays}</b></span><span><i className="muted-dot" />Remaining <b>{totalDays - completedDays}</b></span><small><em>↗</em> 6.8% from last month</small></div></div></div></section>

          <section className="panel habit-panel"><div className="panel-heading habit-heading"><div><h2>Your habits</h2><p>Tap a day to mark it complete</p></div><div className="habit-actions"><span className="calendar-label">September 2026</span><button className="more-button">•••</button></div></div><div className="habit-table-wrap"><div className="habit-table"><div className="table-head"><div className="habit-col">HABIT</div><div className="day-col-group">{dates.map((date) => <div className={date === 14 ? 'day-label today' : 'day-label'} key={date}><span>{dayLabels[(date - 1) % 7]}</span><b>{date}</b></div>)}</div><div className="progress-col">PROGRESS</div></div>{habits.map((habit) => <div className="habit-row" key={habit.id}><div className="habit-col habit-name"><span className="habit-icon" style={{ background: `${habit.color}22` }}>{habit.icon}</span><div><strong>{habit.name}</strong><span>{habit.category}</span></div></div><div className="day-col-group">{habit.days.map((done, index) => <button aria-label={`${habit.name} ${index + 1}`} className={`day-cell ${done ? 'done' : ''} ${index === 13 ? 'today-cell' : ''}`} style={done ? { backgroundColor: habit.color, borderColor: habit.color } : {}} onClick={() => toggleHabit(habit.id, index)} key={index}>{done ? '✓' : ''}</button>)}</div><div className="progress-col progress-value"><span>{habit.progress}%</span><div className="progress-bar"><i style={{ width: `${habit.progress}%`, background: habit.color }} /></div><small>{habit.streak} day streak</small></div></div>)}</div></div><div className="table-footer"><span><i className="legend-square complete" /> Completed</span><span><i className="legend-square" /> Not completed</span><span><i className="legend-square today-legend" /> Today</span><button onClick={() => setShowModal(true)}>Manage habits <span>→</span></button></div></section>
          {allToday && <div className="celebration">Perfect day unlocked. You&apos;re building consistency.</div>}
        </> : <section className="empty-view"><div className="empty-icon">{activeTab === 'Calendar' ? '□' : activeTab === 'Statistics' ? '◒' : activeTab === 'Goals' ? '◎' : '⚙'}</div><h1>{activeTab}</h1><p>This space is ready for your next step. Your dashboard data is always up to date.</p><button className="add-button" onClick={() => setActiveTab('Dashboard')}>Back to dashboard</button></section>}
      </section>

      {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><div className="modal settings-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">PREFERENCES</p><h2>Appearance</h2></div><button onClick={() => setShowSettings(false)}>×</button></div><p className="modal-subtitle">Make HabitFlow feel like yours.</p><div className="theme-options">{['Light', 'Dark', 'System'].map((mode) => <button className={(mode === 'Dark') === dark ? 'selected' : ''} onClick={() => setDark(mode === 'Dark')} key={mode}>{mode}</button>)}</div><label>Accent color</label><div className="swatches">{accentOptions.map((option) => <button aria-label={option.name} className={accent === option.value ? 'selected' : ''} style={{ background: option.value }} onClick={() => setAccent(option.value)} key={option.name} />)}<input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} /></div><button className="secondary-action" onClick={() => setShowSettings(false)}>Done</button></div></div>}
      {showModal && <div className="modal-backdrop" onClick={() => setShowModal(false)}><div className="modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">NEW ROUTINE</p><h2>Create a habit</h2></div><button onClick={() => setShowModal(false)}>×</button></div><p className="modal-subtitle">Choose one small action to keep showing up for.</p><label htmlFor="habit-name">Habit name</label><input id="habit-name" autoFocus placeholder="e.g. Read for 20 minutes" value={newHabit.name} onChange={(event) => setNewHabit({ ...newHabit, name: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') addHabit() }} /><label htmlFor="habit-icon">Icon</label><input id="habit-icon" value={newHabit.icon} maxLength={2} onChange={(event) => setNewHabit({ ...newHabit, icon: event.target.value })} /><label htmlFor="habit-category">Category</label><select id="habit-category" value={newHabit.category} onChange={(event) => setNewHabit({ ...newHabit, category: event.target.value })}>{['Health', 'Study', 'Fitness', 'Personal', 'Productivity', 'Other'].map((category) => <option key={category}>{category}</option>)}</select><button className="add-button modal-submit" onClick={addHabit}>Create habit <span>→</span></button></div></div>}
      {showAuth && <div className="modal-backdrop" onClick={() => setShowAuth(false)}><div className="modal auth-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">YOUR PRIVATE SPACE</p><h2>{authMode === 'sign-in' ? 'Welcome back' : 'Create your account'}</h2></div><button onClick={() => setShowAuth(false)}>×</button></div><p className="modal-subtitle">Sign in to sync your habits across devices.</p><label htmlFor="auth-email">Email</label><input id="auth-email" type="email" autoFocus value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="you@example.com" /><label htmlFor="auth-password">Password</label><input id="auth-password" type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="At least 6 characters" onKeyDown={(event) => { if (event.key === 'Enter') void submitAuth() }} />{authMessage && <p className="auth-message">{authMessage}</p>}<button className="add-button modal-submit" onClick={() => void submitAuth()}>{authMode === 'sign-in' ? 'Sign in' : 'Create account'} <span>→</span></button><button className="auth-switch" onClick={() => { setAuthMode(authMode === 'sign-in' ? 'sign-up' : 'sign-in'); setAuthMessage('') }}>{authMode === 'sign-in' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}</button></div></div>}
      <button className="mobile-add" onClick={() => setShowModal(true)}>+</button>
    </main>
  )
}
