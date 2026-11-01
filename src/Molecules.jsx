import React, { useEffect, useId, useRef, useState } from 'react';
import { components, chainOrder, productKey } from './engine';

export const colours = {
  glucose: ['#f5ce64', '#b48024'], fructose: ['#eeb5aa', '#b26a5c'], galactose: ['#a5c5dd', '#527d9d'],
  glycerol: ['#a6c8d3', '#507e8a'], fattyA: ['#f0d48a', '#a87f2e'], fattyB: ['#eab58e', '#af6b3c'],
  aaA: ['#9dc4ad', '#47775d'], aaB: ['#d2b8dc', '#896394'], aaC: ['#e9b7a4', '#ad725c'],
  phosphate: ['#edcd71', '#a8892f'], deoxy: ['#b8a6cf', '#7e6499'], ribose: ['#a9c9b1', '#598367'],
  baseA: ['#e9afa5', '#a7655c'], baseT: ['#9ebfdb', '#4d799d'], baseG: ['#b7d18f', '#6f8a46'], baseC: ['#e8d47c', '#9f8d3d'], baseU: ['#c6b3dc', '#7b649b'],
};
const glyphs = { glucose: 'G', fructose: 'F', galactose: 'Ga', glycerol: 'Gly', fattyA: 'A', fattyB: 'B', aaA: 'A', aaB: 'B', aaC: 'C', phosphate: 'P', deoxy: 'dR', ribose: 'R' };
export function MoleculeGlyph({ type, x = 0, y = 0, selected = false, small = false, aminoEnd = true, carboxylEnd = true, reverseEndGroups = false }) {
  const [fill, stroke] = colours[type];
  const glyph = glyphs[type] || type.slice(-1);
  return <g transform={`translate(${x} ${y})`} className={`molecule-glyph ${selected ? 'is-selected' : ''}`}>
    {selected && <circle className="selection-halo" r={type === 'glycerol' ? 64 : 53} />}
    {['glucose', 'galactose'].includes(type) ? <polygon points="-44,0 -22,-38 22,-38 44,0 22,38 -22,38" fill={fill} stroke={stroke} strokeWidth="1.8" />
      : type === 'fructose' || ['deoxy', 'ribose'].includes(type) ? <polygon points="0,-42 42,-12 26,35 -26,35 -42,-12" fill={fill} stroke={stroke} strokeWidth="1.8" />
      : type === 'glycerol' ? <><rect x="-22" y="-62" width="44" height="124" rx="10" fill={fill} stroke={stroke} strokeWidth="1.8" />{[-45, 0, 45].map(v => <circle key={v} cx="22" cy={v} r="4" fill={stroke} />)}</>
      : type.startsWith('fatty') ? <><rect x="-56" y="-19" width="112" height="38" rx="19" fill={fill} stroke={stroke} strokeWidth="1.8" /><path d="M-40,4 l10,-8 10,8 10,-8" fill="none" stroke={stroke} strokeWidth="1.6" /><text x="30" y="5" fill={stroke} fontSize="15" fontWeight="700">{glyph}</text></>
      : type.startsWith('aa') ? <><circle r="29" fill={fill} stroke={stroke} strokeWidth="1.8" /><path d="M0,-29 V-43" stroke={stroke} strokeWidth="2" /><rect x="-21" y="-65" width="42" height="25" rx="8" fill={fill} stroke={stroke} /><text y="-48" textAnchor="middle" fill={stroke} fontSize="12" fontWeight="700">R{glyph}</text>{!small && <>{aminoEnd && <text x={reverseEndGroups ? 45 : -45} y="4" textAnchor="middle" className="chemical-group">NH₂</text>}{carboxylEnd && <text x={reverseEndGroups ? -50 : 50} y="4" textAnchor="middle" className="chemical-group">COOH</text>}</>}</>
      : type === 'phosphate' ? <circle r="31" fill={fill} stroke={stroke} strokeWidth="1.8" />
      : <path d="M-37,-23 H24 L39,0 24,23 H-37 Z" fill={fill} stroke={stroke} strokeWidth="1.8" />}
    {!type.startsWith('fatty') && <text y="6" textAnchor="middle" fill={stroke} fontSize={type === 'glycerol' ? 16 : 22} fontWeight="650">{glyph}</text>}
    {type === 'galactose' && <path d="M-15,22 H15 M-10,27 H10" stroke={stroke} strokeWidth="2" />}
    {type === 'glucose' && <circle cy="25" r="2.5" fill={stroke} />}
  </g>;
}
export function SmallMolecule({ type }) {
  return <svg viewBox="-70 -75 140 150" className="small-molecule" aria-hidden="true"><MoleculeGlyph type={type} small /></svg>;
}
function makeLayout(model, module) {
  const groups = components(model);
  const rows = []; let row = [], width = 0;
  for (const group of groups) {
    const connected = group.nodes.length > 1;
    const longChain = ['carbs', 'proteins'].includes(module) && group.nodes.length > 6;
    const w = longChain ? 660 : module === 'lipids' && connected ? 300 : module === 'nucleotides' && connected ? 320 : connected ? Math.max(220, group.nodes.length * 100 + 20) : 150;
    const h = longChain ? 370 : module === 'lipids' && connected ? 250 : 165;
    if (width + w + (row.length ? 26 : 0) > 720 && row.length) { rows.push(row); row = []; width = 0; }
    row.push({ group, w, h }); width += w + (row.length > 1 ? 26 : 0);
  }
  if (row.length) rows.push(row);
  const height = Math.max(340, rows.reduce((sum, r) => sum + Math.max(...r.map(g => g.h)), 0) + 40);
  let y = (height - rows.reduce((sum, r) => sum + Math.max(...r.map(g => g.h)), 0)) / 2;
  const placed = [];
  for (const r of rows) {
    const h = Math.max(...r.map(g => g.h));
    let x = (760 - r.reduce((sum, g) => sum + g.w, 0) - (r.length - 1) * 26) / 2;
    for (const item of r) { placed.push({ ...item, x: x + item.w / 2, y: y + h / 2 - 8 }); x += item.w + 26; }
    y += h;
  }
  return { placed, height };
}
function nodePositions(group, module, x, y) {
  const positions = {}, order = chainOrder(group);
  if (module === 'lipids' && group.edges.length) {
    positions[group.nodes.find(n => n.type === 'glycerol').id] = [x - 72, y];
    group.nodes.filter(n => n.type !== 'glycerol').forEach((n, i) => { positions[n.id] = [x + 66, y + (i - (group.nodes.length - 2) / 2) * 49]; });
  } else if (module === 'nucleotides' && group.edges.length) {
    positions[group.nodes.find(n => n.type === 'phosphate').id] = [x - 100, y - 32];
    positions[group.nodes.find(n => ['deoxy', 'ribose'].includes(n.type)).id] = [x - 12, y + 8];
    positions[group.nodes.find(n => n.type.startsWith('base')).id] = [x + 95, y + 8];
  } else if (order.length > 6) {
    const cols = Math.ceil(order.length / 2);
    order.forEach((n, i) => {
      const col = i < cols ? i : cols - 1 - (i - cols);
      positions[n.id] = [x + (col - (cols - 1) / 2) * 120, y + (i < cols ? -65 : 65)];
    });
  } else order.forEach((n, i) => { positions[n.id] = [x + (i - (order.length - 1) / 2) * (module === 'proteins' ? 105 : 100), y]; });
  return positions;
}
function BondWater({ playback, positions, left, height, t }) {
  const arrowId = useId();
  if (!playback) return null;
  const { record, stage } = playback;
  const entering = record.process === 'hydrolysis';
  if ((!entering || stage !== 1) && (record.process !== 'condensation' || stage !== 2)) return null;
  const source = entering ? record.before : record.after;
  const other = entering ? record.after : record.before;
  const edges = source.edges.filter(edge => !other.edges.some(e => e.id === edge.id));
  return <g className="bond-water-overlay" role="img" aria-label={t(entering ? 'waterEntering' : 'waterLeaving')}>
    <defs><marker id={arrowId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="#367c97" /></marker></defs>
    {edges.map((edge, i) => {
      const a = positions[edge.a], b = positions[edge.b];
      const bond = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const pool = [left + 48 + (i % 5) * 53, height - 38 - Math.floor(i / 5) * 48];
      const [from, to] = entering ? [pool, bond] : [bond, pool];
      return <g key={`${record.id}-${edge.id}`} data-bond-id={edge.id} data-direction={entering ? 'in' : 'out'} className="bond-water-path">
        <line className="water-trajectory" x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} markerEnd={`url(#${arrowId})`} />
        <circle className="water-bond-target" cx={bond[0]} cy={bond[1]} r="17" />
        <g transform={`translate(${from[0]} ${from[1]})`}><g className="travelling-water" style={{ '--water-dx': `${to[0] - from[0]}px`, '--water-dy': `${to[1] - from[1]}px` }}>
          <rect x="-31" y="-26" width="62" height="62" rx="12" fill="#ffffffed" stroke="#9ec8d7" />
          <path d="M-16 -13 0 0 16 -13" fill="none" stroke="#367c97" strokeWidth="4" />
          <circle r="12" fill="#508eab" stroke="#2e647f" /><text y="4" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">O</text>
          {[-16, 16].map(x => <g key={x}><circle cx={x} cy="-13" r="8" fill="white" stroke="#508eab" strokeWidth="1.5" /><text x={x} y="-10" textAnchor="middle" fill="#2e647f" fontSize="9" fontWeight="700">H</text></g>)}
          <text y="29" textAnchor="middle" fill="#245e78" fontSize="15" fontWeight="700">H₂O</text>
        </g></g>
      </g>;
    })}
    <text x={left + 20} y={height - 3} className="water-pool-label">{t('water')} · H₂O</text>
  </g>;
}
export default function MolecularCanvas({ model, module, t, selected, selectedBonds, onSelect, onBond, labels, disabled, onDrop, onDiscard, onDragState, playback }) {
  const { placed, height } = makeLayout(model, module);
  const dropzone = useRef(null);
  const gesture = useRef(null);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState(null);
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 580px)').matches);
  useEffect(() => {
    // A module/preset change or reaction cancels any unfinished gesture.
    gesture.current = null;
    setDrag(null);
    onDragState(null);
  }, [model, module, disabled, onDragState]);
  useEffect(() => {
    const escape = event => {
      if (event.key === 'Escape' && gesture.current) {
        suppressClick.current = true;
        gesture.current = null;
        setDrag(null);
        onDragState(null);
      }
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [onDragState]);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 580px)');
    const update = () => setMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const minX = Math.min(...placed.map(g => g.x - g.w / 2));
  const maxX = Math.max(...placed.map(g => g.x + g.w / 2));
  const viewWidth = mobile && placed.length ? Math.min(760, Math.max(380, maxX - minX + 50)) : 760;
  const allPositions = Object.assign({}, ...placed.map(({ group, x, y }) => nodePositions(group, module, x, y)));
  function outside(event) {
    const bounds = dropzone.current.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  }
  function beginDrag(event, ids) {
    if (disabled || event.button !== 0 || !event.isPrimary || gesture.current) return;
    suppressClick.current = false;
    const inverse = event.currentTarget.ownerSVGElement.getScreenCTM().inverse();
    gesture.current = {
      ids, pointerId: event.pointerId, x: event.clientX, y: event.clientY,
      inverse, origin: new DOMPoint(event.clientX, event.clientY).matrixTransform(inverse), active: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (!current.active && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 8) return;
    current.active = true;
    suppressClick.current = true;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(current.inverse);
    const isOutside = outside(event);
    setDrag({ ids: current.ids, dx: point.x - current.origin.x, dy: point.y - current.origin.y, outside: isOutside });
    onDragState({ outside: isOutside });
  }
  function endDrag(event, cancelled = false) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    gesture.current = null;
    setDrag(null);
    onDragState(null);
    if (current.active && !cancelled && !disabled && outside(event)) onDiscard(current.ids);
  }
  return <div ref={dropzone} className="canvas-dropzone" onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={e => endDrag(e, true)} onLostPointerCapture={e => endDrag(e, true)} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!disabled) onDrop(e.dataTransfer.getData('application/molecule')); }}>
    {!model.nodes.length ? <div className="empty-canvas"><svg viewBox="-70 -65 140 130" aria-hidden="true"><MoleculeGlyph type="glucose" /></svg><h3>{t('empty')}</h3><p>{t('emptyHint')}</p></div> : <svg className={`molecular-canvas ${viewWidth > 600 ? 'crowded' : ''}`} viewBox={`${(760 - viewWidth) / 2} 0 ${viewWidth} ${height}`} aria-label={t('workbench')}>
      {placed.map(({ group, x, y, w }) => {
        const positions = allPositions;
        const order = chainOrder(group);
        const moving = drag?.ids.includes(group.nodes[0].id);
        return <g key={group.nodes[0].id} className={moving ? `dragged-molecule ${drag.outside ? 'outside-workbench' : ''}` : undefined} transform={moving ? `translate(${drag.dx} ${drag.dy})` : undefined}>
          {group.edges.map(edge => {
            const a = positions[edge.a], b = positions[edge.b];
            const active = selectedBonds.includes(edge.id);
            const label = `${t(module === 'nucleotides' ? 'assemblyLink' : module === 'proteins' ? 'peptideBond' : 'bond')} ${model.edges.indexOf(edge) + 1}`;
            return <g key={edge.id} role="button" tabIndex={disabled ? -1 : 0} aria-label={label} aria-pressed={active} className={`bond-control ${active ? 'active' : ''}`} onClick={() => !disabled && onBond(edge.id)} onKeyDown={e => { if (['Enter', ' '].includes(e.key)) { e.preventDefault(); if (!disabled) onBond(edge.id); } }}>
              <title>{label}</title><line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={active ? '#d58145' : '#8a9488'} strokeWidth={active ? 5 : 3} className={module === 'nucleotides' ? 'recognition-link' : ''} />
              <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="transparent" strokeWidth="28" />
              {module !== 'nucleotides' && <><circle cx={(a[0] + b[0]) / 2} cy={(a[1] + b[1]) / 2} r="10" fill={active ? '#d58145' : '#fffdf8'} stroke={active ? '#d58145' : '#a8afa2'} /><path d={`M${(a[0] + b[0]) / 2 - 3},${(a[1] + b[1]) / 2} h6`} stroke={active ? 'white' : '#7a8577'} strokeWidth="1.5" /></>}
            </g>;
          })}
          {group.nodes.map(node => {
            const [nx, ny] = positions[node.id];
            return <g key={node.id} role="button" tabIndex={disabled ? -1 : 0} aria-label={t(node.type)} aria-describedby="discard-help" aria-pressed={selected.includes(node.id)} className="molecule-control" onPointerDown={e => beginDrag(e, group.nodes.map(n => n.id))} onClick={() => !disabled && !suppressClick.current && onSelect(group.nodes.map(n => n.id))} onKeyDown={e => { if (['Enter', ' '].includes(e.key)) { e.preventDefault(); if (!disabled) onSelect(group.nodes.map(n => n.id)); } }}>
              <title>{t(node.type)}</title>{!group.edges.length && <rect x={nx - 65} y={ny - 72} width="130" height="165" rx="9" fill="transparent" />}<MoleculeGlyph type={node.type} x={nx} y={ny} selected={selected.includes(node.id)} aminoEnd={order[0]?.id === node.id} carboxylEnd={order.at(-1)?.id === node.id} reverseEndGroups={order.length > 6 && order.indexOf(node) >= Math.ceil(order.length / 2)} />
              {labels && !group.edges.length && <text x={nx} y={ny + (node.type === 'glycerol' ? 85 : node.type.startsWith('aa') ? 57 : 65)} textAnchor="middle" className="molecule-label">{t(node.type)}</text>}
            </g>;
          })}
          {group.edges.length > 0 && labels && <g><path d={`M${x - w / 2 + 20},${y + (order.length > 6 ? 130 : module === 'lipids' ? 82 : 65)} v5 H${x + w / 2 - 20} v-5`} fill="none" stroke="#c6cbbf" /><text x={x} y={y + (order.length > 6 ? 158 : module === 'lipids' ? 110 : 93)} textAnchor="middle" className="product-label">{t(productKey(group, module))}{group.nodes.length > 2 && module !== 'lipids' && module !== 'nucleotides' ? ` · ${group.nodes.length}` : ''}</text></g>}
        </g>;
      })}
      <BondWater playback={playback} positions={allPositions} left={(760 - viewWidth) / 2} height={height} t={t} />
    </svg>}
  </div>;
}
