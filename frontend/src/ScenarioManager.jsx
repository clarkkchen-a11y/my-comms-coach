import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, orderBy, query, serverTimestamp,
  getDocs, setDoc,
} from 'firebase/firestore';

const DEFAULT_SCENARIOS = [
  { id: 'default-1', title: 'Loading Dock Chitchat', emoji: '🚚', description: 'Casual conversation with colleagues at the loading dock about weekend plans and the upcoming shipment.', isDefault: true },
  { id: 'default-2', title: 'Visual Inspection', emoji: '🔍', description: 'Walking a new team member through a formal quality inspection process for a batch of sofas.', isDefault: true },
  { id: 'default-3', title: 'Assembly Guide', emoji: '📋', description: 'Explaining a complex step in the assembly guide to a confused colleague in simple, clear English.', isDefault: true },
  { id: 'default-4', title: 'Supplier Push-back', emoji: '💼', description: "Telling a supplier that 10% of the sofas have 'stitching defects'. Diplomatic but firm technical English.", isDefault: true },
];

const SCENARIO_ID_MAP = {
  'default-1': '1',
  'default-2': '2',
  'default-3': '3',
  'default-4': '4',
};

export async function seedDefaultScenarios(uid) {
  const ref = collection(db, 'users', uid, 'scenarios');
  const snap = await getDocs(ref);
  if (snap.empty) {
    for (const s of DEFAULT_SCENARIOS) {
      await setDoc(doc(db, 'users', uid, 'scenarios', s.id), {
        title: s.title,
        emoji: s.emoji || '💬',
        description: s.description,
        isDefault: s.isDefault,
        createdAt: serverTimestamp(),
      });
    }
  }
}

export function useScenarios(uid) {
  const [scenarios, setScenarios] = useState([]);
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'users', uid, 'scenarios'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      const data = [];
      snap.forEach(d => data.push({ firestoreId: d.id, ...d.data() }));
      setScenarios(data);
    });
    return unsub;
  }, [uid]);
  return scenarios;
}

export function getBackendScenarioId(scenario) {
  if (scenario?.isDefault) {
    return SCENARIO_ID_MAP[scenario.firestoreId] || 'custom';
  }
  return 'custom';
}

export function getBackendCustomText(scenario) {
  if (!scenario?.isDefault) {
    return `${scenario.title}: ${scenario.description}`;
  }
  return '';
}

// ── Scenario Chip Selector + Manage Drawer ────────────────────────────
export function ScenarioManager({ uid, selectedFsId, onSelect }) {
  const scenarios = useScenarios(uid);
  const [manageOpen, setManageOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editEmoji, setEditEmoji] = useState('💬');
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newEmoji, setNewEmoji] = useState('💬');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const scrollRef = useRef(null);

  const selectedScenario = scenarios.find(s => s.firestoreId === selectedFsId);

  const startEdit = (s) => {
    setEditingId(s.firestoreId);
    setEditTitle(s.title);
    setEditDesc(s.description);
    setEditEmoji(s.emoji || '💬');
    setConfirmDeleteId(null);
  };

  const saveEdit = async (id) => {
    if (!editTitle.trim()) return;
    await updateDoc(doc(db, 'users', uid, 'scenarios', id), {
      title: editTitle.trim(),
      description: editDesc.trim(),
      emoji: editEmoji,
    });
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const restoreDefault = async (s) => {
    const original = DEFAULT_SCENARIOS.find(d => d.id === s.firestoreId);
    if (!original) return;
    await updateDoc(doc(db, 'users', uid, 'scenarios', s.firestoreId), {
      title: original.title,
      description: original.description,
      emoji: original.emoji,
    });
    setEditingId(null);
  };

  const deleteScenario = async (id) => {
    await deleteDoc(doc(db, 'users', uid, 'scenarios', id));
    setConfirmDeleteId(null);
    if (selectedFsId === id && scenarios.length > 1) {
      const next = scenarios.find(s => s.firestoreId !== id);
      if (next) onSelect(next.firestoreId);
    }
  };

  const addScenario = async () => {
    if (!newTitle.trim()) return;
    const ref = await addDoc(collection(db, 'users', uid, 'scenarios'), {
      title: newTitle.trim(),
      description: newDesc.trim(),
      emoji: newEmoji,
      isDefault: false,
      createdAt: serverTimestamp(),
    });
    setIsAdding(false);
    setNewTitle('');
    setNewDesc('');
    setNewEmoji('💬');
    onSelect(ref.id);
  };

  const inputStyle = {
    width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '0.85rem',
    background: 'var(--input-bg)', color: 'inherit', border: '1px solid var(--input-border)',
    boxSizing: 'border-box', marginBottom: '6px', fontFamily: 'inherit',
  };

  return (
    <div className="sm-root">
      {/* ── Label row ── */}
      <div className="sm-label-row">
        <span className="sm-label">Scenario</span>
        <button
          className={`sm-manage-btn ${manageOpen ? 'sm-manage-btn-active' : ''}`}
          onClick={() => { setManageOpen(p => !p); setEditingId(null); setIsAdding(false); }}
        >
          {manageOpen ? '✕ Close' : '⚙ Manage'}
        </button>
      </div>

      {/* ── Chip Grid ── */}
      <div className="sm-chips-wrapper">
        {scenarios.map(s => (
          <button
            key={s.firestoreId}
            className={`sm-chip ${selectedFsId === s.firestoreId ? 'sm-chip-selected' : ''}`}
            onClick={() => onSelect(s.firestoreId)}
            title={s.description}
          >
            <span className="sm-chip-emoji">{s.emoji || '💬'}</span>
            <span className="sm-chip-label">{s.title}</span>
          </button>
        ))}
      </div>

      {/* ── Selected description (compact hint) ── */}
      {selectedScenario && (
        <p className="sm-selected-desc">{selectedScenario.description}</p>
      )}

      {/* ── Manage Drawer ── */}
      {manageOpen && (
        <div className="sm-drawer">
          <div className="sm-drawer-list">
            {scenarios.map(s => (
              <div key={s.firestoreId} className="sm-drawer-row">
                {editingId === s.firestoreId ? (
                  <div className="sm-edit-form">
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                      <input
                        style={{ ...inputStyle, width: '52px', textAlign: 'center', marginBottom: 0, fontSize: '1.2rem', padding: '6px' }}
                        value={editEmoji}
                        onChange={e => setEditEmoji(e.target.value)}
                        maxLength={2}
                        title="Emoji"
                      />
                      <input
                        style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        placeholder="Title"
                        autoFocus
                      />
                    </div>
                    <textarea
                      style={{ ...inputStyle, height: '60px', resize: 'vertical' }}
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                      placeholder="Description"
                    />
                    <div className="sm-edit-actions">
                      <button className="btn-primary sm-btn-sm" onClick={() => saveEdit(s.firestoreId)}>Save</button>
                      {s.isDefault && (
                        <button className="sm-ghost-btn sm-btn-sm" onClick={() => restoreDefault(s)}>↩ Restore</button>
                      )}
                      <button className="sm-ghost-btn sm-btn-sm" onClick={cancelEdit}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="sm-row-emoji">{s.emoji || '💬'}</span>
                    <span className="sm-row-title">
                      {s.title}
                      {s.isDefault && <span className="sm-default-pill">default</span>}
                    </span>
                    <div className="sm-row-actions">
                      <button className="sm-icon-btn" onClick={() => startEdit(s)} title="Edit">✏️</button>
                      {confirmDeleteId === s.firestoreId ? (
                        <>
                          <button className="sm-icon-btn sm-danger-btn" onClick={() => deleteScenario(s.firestoreId)}>Yes, delete</button>
                          <button className="sm-icon-btn" onClick={() => setConfirmDeleteId(null)}>No</button>
                        </>
                      ) : (
                        <button className="sm-icon-btn sm-danger-btn" onClick={() => setConfirmDeleteId(s.firestoreId)} title="Delete">🗑️</button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Add new */}
          {isAdding ? (
            <div className="sm-edit-form" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--input-border)' }}>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                <input
                  style={{ ...inputStyle, width: '52px', textAlign: 'center', marginBottom: 0, fontSize: '1.2rem', padding: '6px' }}
                  value={newEmoji}
                  onChange={e => setNewEmoji(e.target.value)}
                  maxLength={2}
                  title="Emoji"
                />
                <input
                  style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Scenario title"
                  autoFocus
                />
              </div>
              <textarea
                style={{ ...inputStyle, height: '60px', resize: 'vertical' }}
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Describe the scenario context..."
              />
              <div className="sm-edit-actions">
                <button className="btn-primary sm-btn-sm" onClick={addScenario}>Add Scenario</button>
                <button className="sm-ghost-btn sm-btn-sm" onClick={() => { setIsAdding(false); setNewTitle(''); setNewDesc(''); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="sm-add-row-btn" onClick={() => { setIsAdding(true); setEditingId(null); }}>
              + Add custom scenario
            </button>
          )}
        </div>
      )}
    </div>
  );
}
