// Estratto da App.jsx (scorporo monolite).
import React from "react";
import { userKey, safeLsSet } from "./storage.js";

export default function SessionNotesPage({ characters }) {
  const TAG_TIPI = ["Evento","Deduzione","PNG","Luogo","Segreto","Altro"];
  const TAG_COLORS = {
    "Evento":    "#c0392b",
    "Deduzione": "#8e44ad",
    "PNG":       "#2980b9",
    "Luogo":     "#27ae60",
    "Segreto":   "#e67e22",
    "Altro":     "#555",
  };

  const [notes, setNotes] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(userKey("dnd_session_notes")) || "[]"); } catch { return []; }
  });
  const [sessione, setSessione] = React.useState(() => {
    try { return parseInt(localStorage.getItem(userKey("dnd_session_current")) || "1"); } catch { return 1; }
  });
  const [testo, setTesto]       = React.useState("");
  const [tagInput, setTagInput] = React.useState("");
  const [tagsNote, setTagsNote] = React.useState([]);
  const [filtroTags, setFiltroTags] = React.useState([]);
  const [filtroSess, setFiltroSess] = React.useState(null);
  const [editId, setEditId]     = React.useState(null);
  const [showForm, setShowForm] = React.useState(false);
  const textareaRef = React.useRef(null);

  React.useEffect(() => {
    try { safeLsSet(userKey("dnd_session_notes"), JSON.stringify(notes)); } catch {}
  }, [notes]);
  React.useEffect(() => {
    try { safeLsSet(userKey("dnd_session_current"), String(sessione)); } catch {}
  }, [sessione]);

  // tag suggeriti = tipi fissi + nomi personaggi + tag già usati
  const charNames = characters.map(c => c.name).filter(Boolean);
  const usedTags  = [...new Set(notes.flatMap(n => n.tags))];
  const allSuggest = [...new Set([...TAG_TIPI, ...charNames, ...usedTags])];

  const sessions = [...new Set(notes.map(n => n.sessione))].sort((a,b) => b - a);

  const filteredNotes = React.useMemo(() => {
    return notes.filter(n => {
      const matchSess = filtroSess === null || n.sessione === filtroSess;
      const matchTags = filtroTags.length === 0 || filtroTags.every(t => n.tags.includes(t));
      return matchSess && matchTags;
    }).sort((a,b) => b.ts - a.ts);
  }, [notes, filtroSess, filtroTags]);

  const addTag = (t) => {
    const tag = t.trim();
    if (tag && !tagsNote.includes(tag)) setTagsNote(p => [...p, tag]);
    setTagInput("");
  };
  const removeTag = (t) => setTagsNote(p => p.filter(x => x !== t));

  const toggleFiltro = (t) => setFiltroTags(p => p.includes(t) ? p.filter(x=>x!==t) : [...p, t]);

  const openNew = () => {
    setEditId(null);
    setTesto("");
    setTagsNote([]);
    setTagInput("");
    setShowForm(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const openEdit = (note) => {
    setEditId(note.id);
    setTesto(note.testo);
    setTagsNote([...note.tags]);
    setTagInput("");
    setShowForm(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const saveNote = () => {
    if (!testo.trim()) return;
    if (editId) {
      setNotes(p => p.map(n => n.id === editId
        ? { ...n, testo: testo.trim(), tags: tagsNote, editedTs: Date.now() }
        : n));
    } else {
      setNotes(p => [{ id: Date.now().toString(), testo: testo.trim(),
        tags: tagsNote, sessione, ts: Date.now() }, ...p]);
    }
    setShowForm(false);
    setTesto(""); setTagsNote([]); setEditId(null);
  };

  const deleteNote = (id) => {
    if (confirm("Eliminare questa nota?")) setNotes(p => p.filter(n => n.id !== id));
  };

  const tagColor = (t) => TAG_COLORS[t] || "var(--border2)";

  const fmtDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit"})
      + " " + d.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>

      {/* ── HEADER ── */}
      <div className="section-header" style={{marginBottom:0,flexShrink:0,
        display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{color:"var(--gold)",fontSize:"1.05rem",fontWeight:700}}>📓 Note di Sessione</span>
          <div style={{display:"flex",alignItems:"center",gap:6,
            background:"var(--surface2)",borderRadius:6,padding:"4px 10px",border:"1px solid var(--border)"}}>
            <span style={{fontSize:"0.75rem",color:"var(--text3)"}}>Sessione</span>
            <button onClick={()=>setSessione(s=>Math.max(1,s-1))}
              style={{background:"none",border:"none",color:"var(--text2)",cursor:"pointer",fontSize:"1rem",lineHeight:1,padding:"0 2px"}}>‹</button>
            <span style={{fontWeight:700,color:"var(--gold)",minWidth:20,textAlign:"center",fontSize:"0.95rem"}}>{sessione}</span>
            <button onClick={()=>setSessione(s=>s+1)}
              style={{background:"none",border:"none",color:"var(--text2)",cursor:"pointer",fontSize:"1rem",lineHeight:1,padding:"0 2px"}}>›</button>
          </div>
        </div>
        <button className="btn btn-primary" onClick={openNew}
          style={{fontSize:"0.82rem",padding:"7px 14px"}}>
          + Nuova nota
        </button>
      </div>

      {/* ── FILTRI ── */}
      <div style={{padding:"8px 14px",borderBottom:"1px solid var(--border)",flexShrink:0,
        display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
        {/* filtro sessione */}
        <button onClick={()=>setFiltroSess(null)}
          style={{padding:"3px 9px",borderRadius:12,fontSize:"0.75rem",cursor:"pointer",
            background: filtroSess===null ? "var(--gold)" : "var(--surface2)",
            color: filtroSess===null ? "#1a1208" : "var(--text2)",
            border:`1px solid ${filtroSess===null ? "var(--gold)" : "var(--border)"}`,fontWeight:600}}>
          Tutte
        </button>
        {sessions.map(s => (
          <button key={s} onClick={()=>setFiltroSess(filtroSess===s ? null : s)}
            style={{padding:"3px 9px",borderRadius:12,fontSize:"0.75rem",cursor:"pointer",
              background: filtroSess===s ? "var(--gold)" : "var(--surface2)",
              color: filtroSess===s ? "#1a1208" : "var(--text2)",
              border:`1px solid ${filtroSess===s ? "var(--gold)" : "var(--border)"}`,fontWeight:600}}>
            S{s}
          </button>
        ))}
        {sessions.length > 0 && <span style={{color:"var(--border2)",fontSize:"0.8rem"}}>|</span>}
        {/* filtro tag */}
        {[...new Set(notes.flatMap(n=>n.tags))].map(t => (
          <button key={t} onClick={()=>toggleFiltro(t)}
            style={{padding:"3px 9px",borderRadius:12,fontSize:"0.75rem",cursor:"pointer",
              background: filtroTags.includes(t) ? tagColor(t) : "var(--surface2)",
              color: filtroTags.includes(t) ? "#fff" : "var(--text2)",
              border:`1px solid ${filtroTags.includes(t) ? tagColor(t) : "var(--border)"}`,fontWeight:600}}>
            {t}
          </button>
        ))}
      </div>

      {/* ── FORM NUOVA/MODIFICA NOTA ── */}
      {showForm && (
        <div style={{padding:"12px 14px",borderBottom:"1px solid var(--border)",
          background:"var(--surface2)",flexShrink:0}}>
          <textarea ref={textareaRef} value={testo}
            onChange={e=>setTesto(e.target.value)}
            placeholder="Scrivi la nota..."
            rows={3}
            style={{width:"100%",boxSizing:"border-box",resize:"vertical",
              background:"var(--surface)",border:"1px solid var(--border)",
              borderRadius:6,color:"var(--text)",fontSize:"0.9rem",
              padding:"8px 10px",outline:"none",fontFamily:"inherit",lineHeight:1.5}}
          />
          {/* tag selezionati */}
          <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:7,marginBottom:7}}>
            {tagsNote.map(t => (
              <span key={t} style={{
                padding:"3px 8px",borderRadius:10,fontSize:"0.75rem",fontWeight:600,
                background:tagColor(t),color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",gap:4,
              }} onClick={()=>removeTag(t)}>
                {t} ✕
              </span>
            ))}
          </div>
          {/* input tag + suggerimenti */}
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            <input value={tagInput} onChange={e=>setTagInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"||e.key===","){ e.preventDefault(); addTag(tagInput); }}}
              placeholder="+ tag (Invio per aggiungere)"
              style={{flex:"1 1 120px",padding:"5px 9px",background:"var(--surface)",
                border:"1px solid var(--border)",borderRadius:5,color:"var(--text)",fontSize:"0.8rem",outline:"none"}}
            />
            {allSuggest.filter(s=>!tagsNote.includes(s)&&s.toLowerCase().includes(tagInput.toLowerCase()))
              .slice(0,8).map(s => (
              <button key={s} onClick={()=>addTag(s)}
                style={{padding:"3px 8px",borderRadius:10,fontSize:"0.73rem",cursor:"pointer",
                  background:"var(--surface)",border:`1px solid ${tagColor(s)}`,
                  color:tagColor(s),fontWeight:600}}>
                {s}
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <button className="btn btn-primary" onClick={saveNote}
              style={{fontSize:"0.82rem",padding:"7px 18px"}}>
              {editId ? "Salva modifiche" : "Aggiungi nota"}
            </button>
            <button className="btn" onClick={()=>{setShowForm(false);setEditId(null);}}
              style={{fontSize:"0.82rem",padding:"7px 14px"}}>
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* ── LISTA NOTE ── */}
      <div style={{flex:1,overflowY:"auto",padding:"10px 14px"}}>
        {filteredNotes.length === 0 && (
          <div style={{textAlign:"center",color:"var(--text3)",marginTop:48,fontSize:"0.9rem"}}>
            {notes.length === 0
              ? "Nessuna nota ancora. Inizia a scrivere!"
              : "Nessuna nota corrisponde ai filtri selezionati."}
          </div>
        )}
        {filteredNotes.map(note => (
          <div key={note.id} style={{
            background:"var(--surface2)",borderRadius:8,padding:"10px 12px",
            marginBottom:8,border:"1px solid var(--border)",
          }}>
            {/* meta riga */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                <span style={{padding:"2px 7px",borderRadius:10,fontSize:"0.7rem",fontWeight:700,
                  background:"rgba(180,140,50,0.15)",color:"var(--gold)",border:"1px solid var(--border)"}}>
                  S{note.sessione}
                </span>
                {note.tags.map(t => (
                  <span key={t} onClick={()=>toggleFiltro(t)}
                    style={{padding:"2px 7px",borderRadius:10,fontSize:"0.7rem",fontWeight:700,
                      background:tagColor(t),color:"#fff",cursor:"pointer"}}>
                    {t}
                  </span>
                ))}
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span style={{fontSize:"0.68rem",color:"var(--text3)"}}>{fmtDate(note.ts)}</span>
                <button onClick={()=>openEdit(note)}
                  style={{background:"none",border:"none",color:"var(--text3)",cursor:"pointer",
                    fontSize:"0.8rem",padding:"2px 4px"}}>✏</button>
                <button onClick={()=>deleteNote(note.id)}
                  style={{background:"none",border:"none",color:"var(--text3)",cursor:"pointer",
                    fontSize:"0.8rem",padding:"2px 4px"}}>🗑</button>
              </div>
            </div>
            {/* testo */}
            <div style={{fontSize:"0.88rem",color:"var(--text)",lineHeight:1.6,whiteSpace:"pre-wrap"}}>
              {note.testo}
            </div>
            {note.editedTs && (
              <div style={{fontSize:"0.67rem",color:"var(--text3)",marginTop:4}}>
                modificata {fmtDate(note.editedTs)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
