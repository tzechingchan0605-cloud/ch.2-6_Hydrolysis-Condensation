import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Atom, ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, ClipboardList, Download, Droplets, FlaskConical, GripVertical, Info, Leaf, Link2, Microscope, Minus, Pause, Play, Plus, Redo2, RotateCcw, Scissors, SkipForward, Sparkles, Trash2, Undo2, X } from 'lucide-react';
import MolecularCanvas, { SmallMolecule, MoleculeGlyph } from './Molecules';
import { MODULES, TYPES, clone, initialModels, components, productKey, addNode, discardMolecules, preset, join, hydrolyse, enzymeFor } from './engine';
import { translate, modules, challenges } from './content';
import './styles.css';

const STORAGE = 'molecule-lab-v1';
const moduleIcons = { carbs: <HexIcon />, lipids: <LipidIcon />, proteins: <ProteinIcon />, nucleotides: <DnaIcon /> };
function HexIcon() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.5 3h11L23 12l-5.5 9h-11L1 12z" stroke="currentColor" strokeWidth="1.5" /><circle cx="12" cy="12" r="3" fill="currentColor" opacity=".25" /></svg>; }
function LipidIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 3v18M4 5h6l3 3 3-3 4 3M4 12h6l3 3 3-3 4 3M4 19h6l3 3 3-3 4 3" /></svg>; }
function ProteinIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m5 17 6-11 8 10" /><circle cx="5" cy="17" r="3.5" fill="#d1dfcf" /><circle cx="11" cy="6" r="3.5" fill="#e4d3e6" /><circle cx="19" cy="16" r="3.5" fill="#e9c8b3" /></svg>; }
function DnaIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M6 2c0 8 12 12 12 20M18 2C18 10 6 14 6 22M7 5h10M8 9h8M8 15h8M7 19h10" /></svg>; }
function readProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE));
    if (saved?.version === 1 && MODULES.every(m => saved.models[m]?.nodes && saved.models[m]?.edges)) return saved;
  } catch { /* Private browsing or incompatible stored data: use fresh state. */ }
  return { version: 1, lang: 'zh', module: 'carbs', mode: 'explore', models: initialModels(), histories: {}, records: [], responses: {}, task: 0, labels: true, hints: true, speed: 1 };
}
function names(model, module, t) { return components(model).map(c => `${t(productKey(c, module))}${c.nodes.length > 2 && ['carbs', 'proteins'].includes(module) ? ` (${c.nodes.length})` : ''}`).join(' + '); }
function IconButton({ label, children, ...props }) { return <button className="icon-button" aria-label={label} title={label} {...props}>{children}</button>; }
function App() {
  const [state, setState] = useState(readProgress);
  const [selected, setSelected] = useState([]);
  const [selectedBonds, setSelectedBonds] = useState([]);
  const [discardDrag, setDiscardDrag] = useState(null);
  const [feedback, setFeedback] = useState({ key: 'ready', error: false });
  const [modal, setModal] = useState(null);
  const [animation, setAnimation] = useState(null);
  const [paused, setPaused] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const [answerShown, setAnswerShown] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const t = key => translate(state.lang, key);
  const local = pair => pair[state.lang === 'zh' ? 0 : 1];
  const module = state.module;
  const model = state.models[module];
  const history = state.histories[module] || { past: [], future: [] };
  const activeTask = challenges[state.task];
  const response = state.responses[state.task] || { prediction: '', explanation: '' };
  const last = state.records.findLast(r => r.module === module && r.process !== 'response');
  const busy = animation && animation.stage < 3;
  const playbackMessage = busy ? animation.stage === 1 && animation.record.process === 'hydrolysis' ? 'waterEntering' : animation.stage === 2 && animation.record.process === 'condensation' ? 'waterLeaving' : `stage${animation.stage}` : null;
  const displayedModel = busy ? animation.stage < 2 ? animation.record.before : animation.record.after : model;
  const moduleInfo = modules.find(m => m.id === module);
  const isNucleotide = module === 'nucleotides';
  const change = patch => setState(s => ({ ...s, ...patch }));

  useEffect(() => {
    try { localStorage.setItem(STORAGE, JSON.stringify(state)); setStorageError(false); } catch { setStorageError(true); }
    document.documentElement.lang = state.lang === 'zh' ? 'zh-Hant' : 'en';
    document.title = `${translate(state.lang, 'brand')} · ${translate(state.lang, module)}`;
  }, [state, module]);
  useEffect(() => {
    if (!animation || animation.stage >= 3 || paused) return;
    const timeout = setTimeout(() => setAnimation(a => a ? { ...a, stage: a.stage + 1 } : null), 1950 / state.speed);
    return () => clearTimeout(timeout);
  }, [animation, paused, state.speed]);

  function clearSelection() { setSelected([]); setSelectedBonds([]); }
  function commit(next) {
    setState(s => {
      const h = s.histories[module] || { past: [], future: [] };
      return { ...s, models: { ...s.models, [module]: next }, histories: { ...s.histories, [module]: { past: [...h.past.slice(-39), s.models[module]], future: [] } } };
    });
    setAnimation(null); clearSelection();
  }
  function switchModule(id) {
    if (state.mode === 'guided') { loadTask(challenges.findIndex(c => c.module === id)); return; }
    change({ module: id }); clearSelection(); setAnimation(null); setFeedback({ key: 'ready' });
  }
  function add(type) {
    if (!type || busy) return;
    try { commit(addNode(model, type, module)); setFeedback({ key: 'ready' }); } catch (e) { setFeedback({ key: e.message, error: true }); }
  }
  function toggleNodes(ids) { setSelected(prev => ids.every(id => prev.includes(id)) ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]); setSelectedBonds([]); }
  function discard(ids) {
    if (busy) return;
    const next = discardMolecules(model, ids);
    if (next === model) return;
    commit(next);
    setFeedback({ key: 'moleculesDiscarded' });
  }
  function toggleBond(id) { setSelectedBonds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); setSelected([]); }
  function travel(direction) {
    if (busy) return;
    const past = [...history.past], future = [...history.future];
    const next = direction === 'undo' ? past.pop() : future.pop();
    if (!next) return;
    if (direction === 'undo') future.push(model); else past.push(model);
    change({ models: { ...state.models, [module]: next }, histories: { ...state.histories, [module]: { past, future } } });
    clearSelection(); setAnimation(null); setFeedback({ key: 'ready' });
  }
  function react(process, all = false) {
    if (busy) return;
    if (state.mode === 'guided' && !response.prediction.trim()) { setFeedback({ key: 'predictedFirst', error: true }); document.querySelector('#prediction')?.focus(); return; }
    try {
      const result = process === 'join' ? join(model, selected, module) : hydrolyse(model, all ? model.edges.map(e => e.id) : selectedBonds, module);
      const record = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, time: new Date().toISOString(), module, process: result.process, water: result.water, bonds: result.bonds, before: clone(model), after: clone(result.model), prediction: state.mode === 'guided' ? response.prediction : '', explanation: state.mode === 'guided' ? response.explanation : '', task: state.mode === 'guided' ? state.task : null };
      commit(result.model);
      setState(s => ({ ...s, records: [...s.records, record] }));
      setAnimation({ record, stage: 0 }); setPaused(false);
      setFeedback({ key: process === 'join' ? isNucleotide ? 'recognised' : 'joined' : 'broken' });
    } catch (e) { setFeedback({ key: e.message, error: true }); }
  }
  function loadPreset(types) { commit(preset(module, types)); setFeedback({ key: 'presetLoaded' }); }
  function loadTask(index) {
    const task = challenges[index];
    const next = preset(task.module, task.types, task.joined);
    // A supplied disaccharide is a starting reactant, not a condensation the student performed.
    if (task.joined) { next.water = 0; next.released = 0; next.used = 0; }
    setState(s => {
      const h = s.histories[task.module] || { past: [], future: [] };
      return { ...s, module: task.module, task: index, models: { ...s.models, [task.module]: next }, histories: { ...s.histories, [task.module]: { past: [...h.past.slice(-39), s.models[task.module]], future: [] } } };
    });
    clearSelection(); setAnimation(null); setHintShown(false); setAnswerShown(false); setFeedback({ key: 'taskLoaded' });
  }
  function updateResponse(key, value) { change({ responses: { ...state.responses, [state.task]: { ...response, [key]: value } } }); }
  function saveResponse() {
    change({ records: state.records.map(r => r.task === state.task ? { ...r, prediction: response.prediction, explanation: response.explanation } : r) });
    setFeedback({ key: 'responseSaved' });
  }
  function download() {
    const headings = ['date', 'carbs', 'process', 'before', 'linkDelta', 'waterDelta', 'after', 'prediction', 'explanation'].map(k => k === 'carbs' ? (state.lang === 'zh' ? '模組' : 'Module') : t(k));
    const rows = state.records.map(r => [new Date(r.time).toLocaleString(state.lang === 'zh' ? 'zh-HK' : 'en-GB'), t(r.module), t(r.process), names(r.before, r.module, t), `${t(r.process === 'recognition' ? 'connections' : 'bonds')}: ${r.bonds}`, `${r.process === 'condensation' ? '+' : r.process === 'hydrolysis' ? '−' : ''}${r.water}`, names(r.after, r.module, t), r.prediction, r.explanation]);
    // Treat spreadsheet formula prefixes as text when exporting student-entered responses.
    const csvCell = value => `"${String(value).replace(/^[=+@\-]/, s => `'${s}`).replaceAll('"', '""')}"`;
    const blob = new Blob(['\ufeff' + [headings, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `molecule-lab-${state.lang}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <>
    <header className="site-header"><div className="header-inner">
      <a href="#" className="brand" aria-label={t('brand')}><span className="brand-mark"><Atom size={25} strokeWidth={1.6} /></span><span>{t('brand')}<small>MOLECULE LAB</small></span></a>
      <div className="header-tools"><button className="text-button guide-button" onClick={() => setModal('guide')}><BookOpen size={16} />{t('textbook')}</button><button className="text-button notebook-button" onClick={() => setModal('records')}><ClipboardList size={16} />{t('notebook')}{state.records.length > 0 && <span className="count-badge">{state.records.length}</span>}</button><div className="language-switch" aria-label="繁體中文 | English"><button className={state.lang === 'zh' ? 'active' : ''} onClick={() => change({ lang: 'zh' })} lang="zh-Hant">繁體中文</button><span>|</span><button className={state.lang === 'en' ? 'active' : ''} onClick={() => change({ lang: 'en' })} lang="en">English</button></div></div>
    </div></header>

    <main className="page-shell">
      <section className="hero"><div><div className="eyebrow"><span className="mini-leaf"><Leaf size={13} /></span>{t('course')}<span className="eyebrow-divider" />{t('chapters')}</div><h1>{t('title')}</h1><p>{t('subtitle')}</p></div><div className="hero-side"><div className="hero-molecules" aria-hidden="true"><svg viewBox="0 0 260 105"><path d="M65 50H185" stroke="#a7b79c" strokeDasharray="4 5" /><g transform="translate(65 50) scale(.7)"><MoleculeGlyph type="glucose" /></g><g transform="translate(185 50) scale(.7)"><MoleculeGlyph type="fructose" /></g><circle cx="125" cy="50" r="17" fill="#f8f8ef" stroke="#d8decb" /><text x="125" y="55" textAnchor="middle" fill="#6d8668" fontSize="18">+</text><path d="M222 20 Q235 35 222 40 Q209 35 222 20" fill="#b3cfce" /></svg></div><div className="save-status"><span className={storageError ? 'status-dot error' : 'status-dot'} />{t(storageError ? 'storageWarning' : 'saved')}</div></div></section>

      <section className="lab" aria-label={t('workbench')}>
        <div className="lab-navigation"><nav className="module-tabs" aria-label={t('blocks')}>{modules.map(m => <button key={m.id} className={`module-tab ${module === m.id ? 'active' : ''}`} onClick={() => switchModule(m.id)} aria-pressed={module === m.id}><span className="tab-icon">{moduleIcons[m.id]}</span><span>{t(m.id)}</span><span className="tab-number">{m.number}</span></button>)}</nav><div className="mode-switch"><button className={state.mode === 'explore' ? 'active' : ''} onClick={() => change({ mode: 'explore' })}><FlaskConical size={14} />{t('explore')}</button><button className={state.mode === 'guided' ? 'active' : ''} onClick={() => { change({ mode: 'guided' }); loadTask(state.task); }}><Sparkles size={14} />{t('guided')}</button></div></div>

        {state.mode === 'guided' && <section className="challenge-panel"><div className="challenge-heading"><span className="challenge-number">{String(state.task + 1).padStart(2, '0')}<small> / 08</small></span><div><span className="eyebrow">{t('challenge')}</span><h2>{local(activeTask.title)}</h2><p>{local(activeTask.prompt)}</p></div><div className="task-controls"><IconButton label={t('before')} disabled={state.task === 0} onClick={() => loadTask(state.task - 1)}><ChevronLeft size={17} /></IconButton><select aria-label={t('challenge')} value={state.task} onChange={e => loadTask(Number(e.target.value))}>{challenges.map((c, i) => <option key={i} value={i}>{i + 1}. {local(c.title)}</option>)}</select><IconButton label={t('after')} disabled={state.task === 7} onClick={() => loadTask(state.task + 1)}><ChevronRight size={17} /></IconButton></div></div><div className="prediction-row"><label htmlFor="prediction">{t('prediction')}</label><input id="prediction" value={response.prediction} onChange={e => updateResponse('prediction', e.target.value)} placeholder={t('predictHint')} /><button className="text-button" onClick={() => loadTask(state.task)}><RotateCcw size={14} />{t('taskSetup')}</button></div></section>}

        <div className="workbench-grid">
          <aside className="block-tray"><div className="section-label"><span className="step-dot">1</span><h2>{t('blocks')}</h2></div><p className="tray-hint">{t('trayHint')}</p><div className="block-list">{TYPES[module].map(type => <button key={type} className={`block-card type-${type}`} draggable={!busy} disabled={!!busy} onDragStart={e => { e.dataTransfer.setData('application/molecule', type); e.dataTransfer.effectAllowed = 'copy'; }} onClick={() => add(type)} aria-label={`${t('add')} ${t(type)}`}><span className="drag-grip"><GripVertical size={13} /></span><SmallMolecule type={type} /><span className="block-card-label">{t(type)}<small>{t(module === 'carbs' ? 'monosaccharide' : module === 'proteins' ? 'aminoAcid' : type.startsWith('base') ? 'base' : type === 'deoxy' || type === 'ribose' ? 'sugar' : type)}</small></span><span className="add-block"><Plus size={14} /></span></button>)}</div>
          <div className="examples"><h3>{t('tryExample')}</h3>{module === 'carbs' ? <>{[['maltose', ['glucose', 'glucose']], ['sucrose', ['glucose', 'fructose']], ['lactose', ['glucose', 'galactose']], ['sixGlucose', Array(6).fill('glucose')]].map(([key, types]) => <button key={key} disabled={!!busy} onClick={() => loadPreset(types)}>{t(key)}<ArrowUpRight size={13} /></button>)}</> : module === 'lipids' ? <button disabled={!!busy} onClick={() => loadPreset(['glycerol', 'fattyA', 'fattyB', 'fattyA'])}>{t('triglyceride')}<ArrowUpRight size={13} /></button> : module === 'proteins' ? <button disabled={!!busy} onClick={() => loadPreset(['aaA', 'aaB', 'aaC', 'aaA'])}>{t('fourAmino')}<ArrowUpRight size={13} /></button> : <>{[['DNA', ['phosphate', 'deoxy', 'baseA']], ['RNA', ['phosphate', 'ribose', 'baseU']]].map(([label, types]) => <button key={label} disabled={!!busy} onClick={() => loadPreset(types)}>{label}<ArrowUpRight size={13} /></button>)}</>}</div>
          </aside>

          <section className="assembly-area"><div className="canvas-heading"><div><span className="eyebrow small"><span className="live-dot" />{t('live')}</span><h2>{t('workbench')}</h2></div><div className="canvas-toolbar"><IconButton label={t('undo')} disabled={!history.past.length || !!busy} onClick={() => travel('undo')}><Undo2 size={17} /></IconButton><IconButton label={t('redo')} disabled={!history.future.length || !!busy} onClick={() => travel('redo')}><Redo2 size={17} /></IconButton><span className="toolbar-divider" /><IconButton label={t('reset')} disabled={!!busy} onClick={() => { commit(initialModels()[module]); setFeedback({ key: 'modelReset' }); }}><RotateCcw size={16} /></IconButton></div></div>
            <div className="canvas-options"><p>{t(isNucleotide ? 'nucleotideHint' : 'canvasHint')}</p><button className="text-button" disabled={!!busy} onClick={() => { setSelected(model.nodes.map(n => n.id)); setSelectedBonds([]); }}>{t('selectAll')}</button></div>
            <div className={`diagram-area ${busy ? `animating stage-${animation.stage}` : ''} ${paused ? 'animation-paused' : ''}`} style={{ '--reaction-duration': `${1950 / state.speed}ms` }}>
              <MolecularCanvas model={displayedModel} module={module} t={t} selected={busy ? [] : selected} selectedBonds={busy ? [] : selectedBonds} onSelect={toggleNodes} onBond={toggleBond} labels={state.labels} disabled={!!busy} onDrop={add} onDiscard={discard} onDragState={setDiscardDrag} playback={busy ? animation : null} />
              {busy && <div className={`reaction-stage stage-${animation.stage}`} aria-live="polite"><span className="stage-pulse" />{t(playbackMessage)}</div>}
              <div className="canvas-bottom"><span><span className="schematic-mark" />{t('schematic')}</span><div className="toggles"><label><input type="checkbox" checked={state.labels} onChange={e => change({ labels: e.target.checked })} />{t('labels')}</label><label><input type="checkbox" checked={state.hints} onChange={e => change({ hints: e.target.checked })} />{t('hints')}</label></div></div>
            </div>
            <div className={`discard-bar ${discardDrag ? 'drag-active' : ''} ${discardDrag?.outside ? 'discard-ready' : ''}`}><p id="discard-help">{t('discardHint')}</p><button className="discard-button" disabled={!!busy || (!selected.length && !discardDrag)} onClick={() => discard(selected)} aria-describedby="discard-help"><Trash2 size={15} /><span>{t(discardDrag?.outside ? 'releaseToRemove' : 'removeSelected')}</span></button></div>
            <div className="canvas-status"><div className={`feedback ${feedback.error ? 'feedback-error' : ''}`} role="status" aria-live="polite">{feedback.error ? <CircleHelp size={15} /> : <Info size={15} />}<span>{t(playbackMessage || feedback.key)}</span></div>{(selected.length > 0 || selectedBonds.length > 0) && <button className="selection-count" onClick={clearSelection}>{t('selected')} {selectedBonds.length || selected.length}<X size={12} /></button>}</div>
            <div className="model-stats"><div><span className="stat-icon"><Atom size={15} /></span><span>{t('units')}</span><strong data-testid="unit-count">{displayedModel.nodes.length}</strong></div><div><span className="stat-icon"><Link2 size={15} /></span><span>{t(isNucleotide ? 'connections' : 'bonds')}</span><strong data-testid="bond-count">{displayedModel.edges.length}</strong></div><div><span className="stat-icon water-stat"><Droplets size={15} /></span><span>{t('waterAvailable')}</span><strong data-testid="water-count">{displayedModel.water}</strong></div></div>
          </section>

          <aside className="reaction-panel"><div className="section-label"><span className="step-dot">2</span><h2>{t('reaction')}</h2></div><div className="reaction-action condensation-action"><div className="reaction-action-label"><span className="reaction-symbol"><Link2 size={17} /></span><div><h3>{t(isNucleotide ? 'recognition' : 'condensation')}</h3><p>{t(isNucleotide ? 'recognitionHint' : 'condensationHint')}</p></div></div><button className="primary-button" disabled={!!busy} onClick={() => react('join')}>{t(isNucleotide ? 'assemble' : 'join')}<ArrowRight size={15} /></button></div>
            {!isNucleotide && <><div className="reaction-action hydrolysis-action"><div className="reaction-action-label"><span className="reaction-symbol"><Scissors size={17} /></span><div><h3>{t('hydrolysis')}</h3><p>{t('hydrolysisHint')}</p></div></div><button className="secondary-button" disabled={!!busy} onClick={() => react('break')}>{t('break')}<Scissors size={14} /></button><button className="full-hydrolysis" disabled={!!busy || !model.edges.length} onClick={() => react('break', true)}>{t('breakAll')}<ArrowUpRight size={12} /></button></div><div className="water-tray"><div className="water-title"><Droplets size={17} /><h3>{t('waterTray')}</h3><span>H₂O</span></div><div className="water-tray-content"><div className="water-bubbles" aria-hidden="true">{displayedModel.water ? Array.from({ length: Math.min(displayedModel.water, 6) }, (_, i) => <span key={i}><Droplets size={17} /></span>) : <span className="empty-water"><Droplets size={27} /></span>}</div><div className="water-total">{displayedModel.water}<small>{t('waterAvailable')}</small></div></div><button className="add-water" disabled={!!busy} onClick={() => { if (model.water >= 30) { setFeedback({ key: 'waterLimit', error: true }); return; } commit({ ...model, water: model.water + 1 }); setFeedback({ key: 'ready' }); }}><Plus size={14} />{t('addWater')}</button><div className="water-ledger"><span><ArrowDown size={12} />{t('released')} <b>{displayedModel.released}</b></span><span><ArrowUpRight size={12} />{t('used')} <b>{displayedModel.used}</b></span></div></div></>}
            {isNucleotide && <div className="recognition-callout"><DnaIcon /><p>{t('nucleotideNote')}</p></div>}
            {state.hints && <div className="conditions-note"><Info size={15} /><p>{t('conditions')}</p></div>}
          </aside>
        </div>

        <div className="playback-bar"><div className="playback-controls"><button className="text-button" disabled={!last || !!busy} onClick={() => { setAnimation({ record: last, stage: 0 }); setPaused(false); }}><RotateCcw size={13} />{t('replay')}</button><IconButton label={t(paused ? 'play' : 'pause')} disabled={!busy} onClick={() => setPaused(p => !p)}>{paused ? <Play size={14} /> : <Pause size={14} />}</IconButton><IconButton label={t('step')} disabled={!busy} onClick={() => { setPaused(true); setAnimation(a => ({ ...a, stage: a.stage + 1 })); }}><SkipForward size={14} /></IconButton><span className="playback-progress" aria-hidden="true">{[0, 1, 2, 3].map(i => <span key={i} className={animation && i <= animation.stage ? 'filled' : ''} />)}</span>{animation && <span className="stage-description">{t(`stage${animation.stage}`)}</span>}</div><div className="playback-settings"><label>{t('speed')}<select value={state.speed} onChange={e => change({ speed: Number(e.target.value) })}><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select></label><span>{t('animationNote')}</span></div></div>
      </section>

      <div className="evidence-grid"><section className="observations card"><div className="card-heading"><div className="section-label"><span className="step-dot">3</span><h2>{t('observation')}</h2></div><button className="text-button" onClick={() => setModal('records')}>{t('notebook')}<ArrowUpRight size={14} /></button></div><p className="card-subtitle">{t('observationSub')}</p>
        {last ? <><div className="reaction-equation"><div><span className="equation-label">{t('before')}</span><p>{names(last.before, module, t)}{last.process === 'hydrolysis' && <em> + {last.water} H₂O</em>}</p></div><span className="equation-arrow"><span>{t(last.process)}</span><ArrowRight size={38} strokeWidth={1} /></span><div><span className="equation-label">{t('after')}</span><p>{names(last.after, module, t)}{last.process === 'condensation' && <em> + {last.water} H₂O</em>}</p></div></div><div className="evidence-chips"><span><Link2 size={13} />{t(last.process === 'hydrolysis' ? 'broken' : last.process === 'recognition' ? 'recognised' : 'joined')}</span>{last.process !== 'recognition' && <span className="water-chip"><Droplets size={13} />{t(last.process === 'hydrolysis' ? 'waterReactant' : 'waterProduct')}</span>}</div></> : <div className="no-observations"><div className="notebook-illustration"><ClipboardList size={28} strokeWidth={1.2} /><span><Plus size={11} /></span></div><p>{t('noReaction')}</p><div className="little-rule"><span>{t('condensation')}</span><ArrowRight size={18} /><span>+ H₂O</span><span className="little-divider" /><span>{t('hydrolysis')}</span><ArrowRight size={18} /><span>− H₂O</span></div></div>}
        {state.mode === 'guided' && <div className="explanation-area"><label htmlFor="explanation">{t('explanation')}</label><textarea id="explanation" value={response.explanation} placeholder={t('explainHint')} onChange={e => updateResponse('explanation', e.target.value)} /><div className="explanation-actions"><button className="secondary-button" onClick={saveResponse}><Check size={14} />{t('saveResponse')}</button><button className="text-button" onClick={() => setHintShown(v => !v)}><CircleHelp size={14} />{t('hint')}</button><button className="text-button" onClick={() => setAnswerShown(v => !v)}>{t('showAnswer')}<ChevronDown size={13} /></button></div>{hintShown && <p className="response-hint">{local(activeTask.hint)}</p>}{answerShown && <div className="model-answer"><strong>{t('answerLabel')}</strong><p>{local(activeTask.answer)}</p></div>}</div>}
        <div className="observation-footnote"><Info size={14} /><p>{t(isNucleotide ? 'nucleotideNote' : module === 'lipids' ? 'lipidNote' : 'linearRule')}</p></div>
      </section>
      <section className="chapter-card card"><div className="eyebrow"><BookOpen size={13} />{t(isNucleotide ? 'dnaRna' : 'chapterLink')}</div><h2>{t(isNucleotide ? 'dnaRna' : 'digestion')}</h2>{isNucleotide ? <DnaComparison t={t} /> : <><div className="digestion-diagram"><span className="food-symbol">{moduleIcons[module]}</span><div className="enzyme-arrow"><span>{t(module === 'carbs' ? (last ? enzymeFor(components(last.process === 'hydrolysis' ? last.before : last.after).find(c => c.edges.length) || components(model)[0] || { nodes: [], edges: [] }, module) : 'carbEnzymes') : module === 'lipids' ? 'lipidEnzymes' : 'proteases')}</span><ArrowRight size={46} strokeWidth={1} /><small>+ H₂O</small></div><div className="digestion-products"><SmallMolecule type={module === 'carbs' ? 'glucose' : module === 'lipids' ? 'fattyA' : 'aaA'} /><SmallMolecule type={module === 'carbs' ? 'glucose' : module === 'lipids' ? 'glycerol' : 'aaB'} /></div></div><p>{t(module === 'carbs' ? 'digestionCarbs' : module === 'lipids' ? 'digestionLipids' : 'digestionProteins')}</p></>}<button className="text-button" onClick={() => setModal('guide')}>{t('textbook')} · §{moduleInfo.section}<ArrowUpRight size={13} /></button></section></div>

      <section className="knowledge-strip"><div className="knowledge-heading"><span><Leaf size={17} /></span><h2>{t('functions')}</h2></div>{module === 'carbs' ? <div className="function-grid">{['functionGlucose', 'functionStarch', 'functionGlycogen', 'functionCellulose'].map((key, i) => <div key={key}><span className={`function-dot dot-${i}`} /><p>{t(key)}</p></div>)}</div> : <p>{t(module === 'lipids' ? 'functionLipids' : module === 'proteins' ? 'functionProteins' : 'nucleicFunction')}</p>}</section>
      {state.hints && <p className="model-limitation"><Info size={14} />{t(module === 'carbs' ? 'celluloseNote' : moduleInfo.note)}</p>}
      {module === 'proteins' && <section className="sequence-card card"><div><h2>{t('sequence')}</h2><p>{t('sequenceNote')}</p></div><svg viewBox="0 0 330 140" aria-label={t('sequence')}><path d="M25 40L90 40L155 40L220 40M25 110L90 75L155 110L220 75" fill="none" stroke="#a8afa2" strokeWidth="3" />{['aaA', 'aaB', 'aaC', 'aaA'].map((type, i) => <g key={i} transform={`translate(${25 + i * 65} 40) scale(.37)`}><MoleculeGlyph type={type} small /></g>)}{['aaA', 'aaC', 'aaB', 'aaA'].map((type, i) => <g key={i} transform={`translate(${25 + i * 65} ${i % 2 ? 75 : 110}) scale(.37)`}><MoleculeGlyph type={type} small /></g>)}<text x="252" y="44" fill="#56684f" fontSize="12">A–B–C–A</text><text x="252" y="104" fill="#56684f" fontSize="12">A–C–B–A</text></svg></section>}
    </main>
    <footer className="site-footer"><span className="footer-brand"><Atom size={16} />{t('footer')}</span><span>{t('footerScope')}<span className="footer-dot">·</span><button onClick={() => setModal('reset')}>{t('resetAll')}</button></span></footer>

    {modal && <Modal title={t(modal === 'guide' ? 'references' : modal === 'records' ? 'notebook' : 'confirmReset')} onClose={() => setModal(null)} closeLabel={t('close')}>
      {modal === 'guide' ? <div className="guide-content"><p className="guide-intro">{t('sourceIntro')}</p>{modules.map(m => <section key={m.id}><h3><span className="tab-icon">{moduleIcons[m.id]}</span>§{m.section} {t(m.id)}</h3><p>{t(m.source)}</p></section>)}<section><h3>{t('modelLimits')}</h3><p>{t('limits')}</p><p>{t('conditions')}</p><p>{t('polyNote')}</p><p>{t('lipidNote')}</p><p>{t('proteinNote')}</p><p>{t('sequenceNote')}</p><p>{t('nucleotideNote')}</p><p>{t('celluloseNote')}</p></section></div> : modal === 'records' ? <div className="notebook-content"><div className="notebook-toolbar"><span>{state.records.length} {t('recordCount')}</span><button className="primary-button" disabled={!state.records.length} onClick={download}><Download size={15} />{t('export')}</button></div>{!state.records.length ? <p className="empty-notebook">{t('noRecords')}</p> : <div className="record-list">{[...state.records].reverse().map((r, i) => <article className="record-item" key={r.id}><div className="record-top"><span className={`record-process process-${r.process}`}>{t(r.process)}</span><span>{t(r.module)} · {new Date(r.time).toLocaleTimeString(state.lang === 'zh' ? 'zh-HK' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}</span><b>#{state.records.length - i}</b></div><div className="record-models"><span>{names(r.before, r.module, t)}</span><ArrowRight size={18} /><span>{names(r.after, r.module, t)}</span></div><div className="record-meta"><span>{t(r.process === 'recognition' ? 'connections' : 'bonds')}: {r.process === 'hydrolysis' ? '−' : '+'}{r.bonds}</span><span>{t('water')}: {r.process === 'hydrolysis' ? '−' : r.process === 'condensation' ? '+' : ''}{r.water}</span></div><div className="record-responses"><p><strong>{t('prediction')}:</strong> {r.prediction || '—'}</p><p><strong>{t('explanation')}:</strong> {r.explanation || '—'}</p></div></article>)}</div>}</div> : <div className="reset-modal"><p>{t('resetWarning')}</p><div><button className="secondary-button" onClick={() => setModal(null)}>{t('cancel')}</button><button className="danger-button" onClick={() => { setState({ version: 1, lang: state.lang, module: 'carbs', mode: 'explore', models: initialModels(), histories: {}, records: [], responses: {}, task: 0, labels: true, hints: true, speed: 1 }); clearSelection(); setAnimation(null); setModal(null); setFeedback({ key: 'ready' }); }}>{t('resetAll')}</button></div></div>}
    </Modal>}
  </>;
}
function DnaComparison({ t }) {
  return <><div className="dna-illustrations" aria-hidden="true"><div><svg viewBox="0 0 80 80"><path d="M22 6 C70 30 10 50 58 74M58 6C10 30 70 50 22 74" fill="none" stroke="#927bab" strokeWidth="5" />{[16, 28, 40, 52, 64].map((y, i) => <path key={y} d={`M${i % 2 ? 30 : 23} ${y}h${i % 2 ? 20 : 34}`} stroke={i % 2 ? '#c4a752' : '#77a492'} strokeWidth="4" />)}</svg><b>DNA</b></div><div><svg viewBox="0 0 80 80"><path d="M30 6C65 23 14 40 48 74" fill="none" stroke="#77a492" strokeWidth="5" />{[18, 30, 42, 54, 66].map((y, i) => <path key={y} d={`M${i % 2 ? 36 : 43} ${y}h17`} stroke={i % 2 ? '#d5a784' : '#927bab'} strokeWidth="4" />)}</svg><b>RNA</b></div></div><table className="dna-table"><thead><tr><th>{t('structure')}</th><th>DNA</th><th>RNA</th></tr></thead><tbody><tr><th>{t('sugar')}</th><td>{t('deoxy')}</td><td>{t('ribose')}</td></tr><tr><th>{t('bases')}</th><td>A, T, G, C</td><td>A, U, G, C</td></tr><tr><th>{t('structure')}</th><td>{t('doubleHelix')}</td><td>{t('singleStrand')}</td></tr></tbody></table></>;
}
function Modal({ title, children, onClose, closeLabel }) {
  const ref = React.useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current; dialog.showModal();
    return () => { dialog.close(); previous?.focus?.(); };
  }, []);
  return <dialog ref={ref} className="modal" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === ref.current) onClose(); }} aria-labelledby="modal-title"><div className="modal-heading"><h2 id="modal-title">{title}</h2><IconButton label={closeLabel} onClick={onClose}><X size={20} /></IconButton></div>{children}</dialog>;
}

createRoot(document.getElementById('root')).render(<App />);
