'use client'

import { useEffect, useMemo, useState } from 'react'
import { Database, Plus, RefreshCw, Save, Shield, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Lang = 'en' | 'es'
type Profile = { code: string; name: string; status: string; level?: number }
type Book = { id: number; title: string; subtitle: string; status: string; parts: { title: string; chapters: string[] }[] }
type AdminProps = { lang: Lang; profiles: Profile[]; books: Book[]; setBooks: (books: Book[]) => void }
type LedgerRow = { user_code: string; full_name: string | null; status: string | null; level: number | null; is_admin: boolean | null }
type ChapterRow = { chapter_id: string; book_title: string; part_title: string | null; sub_part_title: string | null; chapter_number: number; content: string; is_visible: boolean }
type OptionRow = { id: number; name: string; description: string | null; active: boolean | null }
type MessageRow = { key: string; text: string; note: string | null }

const labels = {
  en: { title: 'Overlord Dashboard', status: 'PRIVILEGED SESSION', chronology: 'Chronology & literary engine', users: 'R26 ledger & monitor', classes: 'Classes & professions', messages: 'System messages', refresh: 'Refresh live state', book: 'Book title', part: 'Part', subpart: 'Sub-part', chapter: 'Chapter number', content: 'Chapter content', cadence: 'Release cadence is stored by visibility rules', visible: 'Visible', add: 'Create chapter', save: 'Save', delete: 'Delete', name: 'Full name', profileStatus: 'Status', description: 'Description', create: 'Create option', empty: 'No live rows returned.', saved: 'Saved to Supabase.', failed: 'The database rejected this operation.' },
  es: { title: 'Panel Overlord', status: 'SESIÓN PRIVILEGIADA', chronology: 'Cronología y motor literario', users: 'Libro mayor R26 y monitor', classes: 'Clases y profesiones', messages: 'Mensajes del sistema', refresh: 'Actualizar estado real', book: 'Título del libro', part: 'Parte', subpart: 'Subparte', chapter: 'Número de capítulo', content: 'Contenido del capítulo', cadence: 'La cadencia se conserva en las reglas de visibilidad', visible: 'Visible', add: 'Crear capítulo', save: 'Guardar', delete: 'Eliminar', name: 'Nombre completo', profileStatus: 'Estado', description: 'Descripción', create: 'Crear opción', empty: 'No hay filas reales.', saved: 'Guardado en Supabase.', failed: 'La base de datos rechazó la operación.' },
}

const normalize = (value: string, max: number) => value.trim().replace(/\s+/g, ' ').slice(0, max)

export function AdminPanel({ lang }: AdminProps) {
  const t = labels[lang]
  const [tab, setTab] = useState('chronology')
  const [profiles, setProfiles] = useState<LedgerRow[]>([])
  const [chapters, setChapters] = useState<ChapterRow[]>([])
  const [classes, setClasses] = useState<OptionRow[]>([])
  const [professions, setProfessions] = useState<OptionRow[]>([])
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [bookTitle, setBookTitle] = useState('')
  const [part, setPart] = useState('')
  const [subPart, setSubPart] = useState('')
  const [chapterNumber, setChapterNumber] = useState('1')
  const [content, setContent] = useState('')
  const [optionName, setOptionName] = useState('')
  const [optionDescription, setOptionDescription] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    const [profileResult, chapterResult, classResult, professionResult, messageResult] = await Promise.all([
      supabase.from('system_profiles').select('user_code, full_name, status, level, is_admin').order('user_code'),
      supabase.from('chronicle_chapters').select('chapter_id, book_title, part_title, sub_part_title, chapter_number, content, is_visible').order('chapter_number'),
      supabase.from('class_options').select('id, name, description, active').order('id'),
      supabase.from('profession_options').select('id, name, description, active').order('id'),
      supabase.from('system_messages').select('key, text, note').order('key'),
    ])
    if (profileResult.error) setNotice(profileResult.error.message)
    setProfiles(profileResult.data ?? [])
    setChapters(chapterResult.data ?? [])
    setClasses(classResult.data ?? [])
    setProfessions(professionResult.data ?? [])
    setMessages(messageResult.data ?? [])
  }
  useEffect(() => { void load() }, [])

  const activeReaders = useMemo(() => profiles.filter((row) => !row.is_admin && row.status === 'activo').length, [profiles])
  const updateProfile = async (userCode: string, fullName: string, status: string) => {
    const safeName = normalize(fullName, 120)
    const { error } = await supabase.from('system_profiles').update({ full_name: safeName, status: normalize(status, 24) }).eq('user_code', userCode)
    setNotice(error ? `${t.failed} ${error.message}` : t.saved)
    if (!error) await load()
  }
  const addChapter = async () => {
    const safeTitle = normalize(bookTitle, 160)
    const safeContent = content.trim().slice(0, 100000)
    if (!safeTitle || !safeContent) return setNotice(t.failed)
    const row = { chapter_id: crypto.randomUUID(), book_title: safeTitle, part_title: normalize(part, 120), sub_part_title: normalize(subPart, 120), chapter_number: Math.max(1, Number(chapterNumber) || 1), content: safeContent, is_visible: false }
    const { error } = await supabase.from('chronicle_chapters').insert(row)
    setNotice(error ? `${t.failed} ${error.message}` : t.saved)
    if (!error) { setBookTitle(''); setPart(''); setSubPart(''); setContent(''); await load() }
  }
  const deleteChapter = async (chapterId: string) => {
    const { error } = await supabase.from('chronicle_chapters').delete().eq('chapter_id', chapterId)
    setNotice(error ? `${t.failed} ${error.message}` : t.saved)
    if (!error) await load()
  }
  const addOption = async (table: 'class_options' | 'profession_options') => {
    const name = normalize(optionName, 120)
    if (!name) return setNotice(t.failed)
    const { error } = await supabase.from(table).insert({ name, description: optionDescription.trim().slice(0, 1000), active: true })
    setNotice(error ? `${t.failed} ${error.message}` : t.saved)
    if (!error) { setOptionName(''); setOptionDescription(''); await load() }
  }
  const updateMessage = async (key: string, text: string) => {
    const { error } = await supabase.from('system_messages').update({ text: text.slice(0, 2000) }).eq('key', key)
    setNotice(error ? `${t.failed} ${error.message}` : t.saved)
    if (!error) await load()
  }

  return <div className="admin-panel">
    <div className="admin-head"><div><span className="eyebrow">MASTER CONTROL // PRIVATE SESSION</span><h2>{t.title}</h2></div><div className="admin-status"><i /> {t.status}</div></div>
    <div className="admin-tabs">{[['chronology', t.chronology], ['users', t.users], ['options', t.classes], ['messages', t.messages]].map(([key, label]) => <button type="button" className={tab === key ? 'active' : ''} onClick={() => setTab(key)} key={key}>{label}</button>)}<button type="button" className="btn-small" onClick={() => void load()}><RefreshCw size={13} /> {t.refresh}</button></div>
    <div className="admin-grid"><div className="admin-card"><Database size={18} /><span>CHAPTERS</span><b>{chapters.length}</b><small>chronicle_chapters · live</small></div><div className="admin-card"><Shield size={18} /><span>ACTIVE READERS</span><b>{activeReaders} / {profiles.filter((row) => !row.is_admin).length}</b><small>system_profiles · live</small></div><div className="admin-card"><Database size={18} /><span>OPTIONS</span><b>{classes.length + professions.length}</b><small>classes + professions</small></div></div>
    {notice && <div className="system-alert"><Database size={16} /><span>{notice}</span></div>}
    {tab === 'chronology' && <div className="admin-editor"><div className="editor-form"><label>{t.book}<input value={bookTitle} maxLength={160} onChange={(e) => setBookTitle(e.target.value)} /></label><div className="form-grid"><label>{t.part}<input value={part} maxLength={120} onChange={(e) => setPart(e.target.value)} /></label><label>{t.subpart}<input value={subPart} maxLength={120} onChange={(e) => setSubPart(e.target.value)} /></label><label>{t.chapter}<input type="number" min="1" value={chapterNumber} onChange={(e) => setChapterNumber(e.target.value)} /></label></div><label>{t.content}<textarea value={content} maxLength={100000} onChange={(e) => setContent(e.target.value)} /></label><p className="muted-copy">{t.cadence}</p><button type="button" className="btn-small" onClick={() => void addChapter()}><Plus size={13} /> {t.add}</button></div><div className="admin-list">{chapters.map((chapter) => <div className="admin-row" key={chapter.chapter_id}><div><b>{chapter.book_title}</b><span>{chapter.part_title} / {chapter.sub_part_title} · {chapter.is_visible ? t.visible : 'LOCKED'}</span></div><button type="button" className="icon-button" onClick={() => void deleteChapter(chapter.chapter_id)} aria-label={t.delete}><Trash2 size={14} /></button></div>)}{!chapters.length && <p className="muted-copy">{t.empty}</p>}</div></div>}
    {tab === 'users' && <div className="admin-list">{profiles.map((row) => <div className="admin-row" key={row.user_code}><code>{row.user_code}</code><input defaultValue={row.full_name ?? ''} maxLength={120} onBlur={(e) => void updateProfile(row.user_code, e.target.value, row.status ?? 'no_activado')} /><select defaultValue={row.status ?? 'no_activado'} onChange={(e) => void updateProfile(row.user_code, row.full_name ?? '', e.target.value)}><option>activo</option><option>inactivo</option><option>suspendido</option><option>no_activado</option></select></div>)}{!profiles.length && <p className="muted-copy">{t.empty}</p>}</div>}
    {tab === 'options' && <div className="admin-editor"><div className="editor-form"><label>{t.name}<input value={optionName} maxLength={120} onChange={(e) => setOptionName(e.target.value)} /></label><label>{t.description}<textarea value={optionDescription} maxLength={1000} onChange={(e) => setOptionDescription(e.target.value)} /></label><div className="form-actions"><button type="button" className="btn-small" onClick={() => void addOption('class_options')}><Plus size={13} /> {t.create} · Classes</button><button type="button" className="btn-small" onClick={() => void addOption('profession_options')}><Plus size={13} /> {t.create} · Professions</button></div></div><div className="admin-list">{[...classes, ...professions].map((row) => <div className="admin-row" key={`${row.id}-${row.name}`}><div><b>{row.name}</b><span>{row.description}</span></div><span>{row.active ? 'ACTIVE' : 'INACTIVE'}</span></div>)}</div></div>}
    {tab === 'messages' && <div className="admin-list">{messages.map((row) => <div className="admin-row message-row" key={row.key}><code>{row.key}</code><input defaultValue={row.text} maxLength={2000} onBlur={(e) => void updateMessage(row.key, e.target.value)} /><Save size={14} /></div>)}{!messages.length && <p className="muted-copy">{t.empty}</p>}</div>}
  </div>
}
