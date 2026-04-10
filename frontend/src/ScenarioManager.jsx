import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, orderBy, query, serverTimestamp,
  getDocs, setDoc,
} from 'firebase/firestore';

// The 4 built-in default scenarios — seeded into Firestore on first load
const DEFAULT_SCENARIOS = [
  { id: 'default-1', title: 'The Loading Dock Chitchat', description: 'Casual conversation with colleagues at the loading dock about weekend plans and the upcoming shipment.', isDefault: true },
  { id: 'default-2', title: 'The Visual Inspection', description: 'Walking a new team member through a formal quality inspection process for a batch of sofas.', isDefault: true },
  { id: 'default-3', title: 'The Assembly Guide', description: 'Explaining a complex step in the assembly guide to a confused colleague in simple, clear English.', isDefault: true },
  { id: 'default-4', title: 'The Supplier Push-back', description: "Telling a supplier that 10% of the sofas have 'stitching defects'. Diplomatic but firm technical English.", isDefault: true },
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
  // Only seed if no scenarios exist yet
  if (snap.empty) {
    for (const s of DEFAULT_SCENARIOS) {
      await setDoc(doc(db, 'users', uid, 'scenarios', s.id), {
        title: s.title,
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

// Map Firestore scenario to the backend scenario_id value
export function getBackendScenarioId(scenario) {
  if (scenario.isDefault) {
    return SCENARIO_ID_MAP[scenario.firestoreId] || 'custom';
  }
  return 'custom';
}

export function getBackendCustomText(scenario) {
  if (!scenario.isDefault) {
    return `${scenario.title}: ${scenario.description}`;
  }
  return '';
}

export function ScenarioManager({ uid, selectedFsId, onSelect }) {
  const scenarios = useScenarios(uid);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const startEdit = (s) => {
    setEditingId(s.firestoreId);
    setEditTitle(s.title);
    setEditDesc(s.description);
  };

  const saveEdit = async (firestoreId) => {
    if (!editTitle.trim()) return;
    await updateDoc(doc(db, 'users', uid, 'scenarios', firestoreId), {
      title: editTitle.trim(),
      description: editDesc.trim(),
    });
    setEditingId(null);
  };

  const restoreDefault = async (s) => {
    const original = DEFAULT_SCENARIOS.find(d => d.id === s.firestoreId);
    if (!original) return;
    await updateDoc(doc(db, 'users', uid, 'scenarios', s.firestoreId), {
      title: original.title,
      description: original.description,
    });
    setEditingId(null);
  };

  const deleteScenario = async (firestoreId) => {
    await deleteDoc(doc(db, 'users', uid, 'scenarios', firestoreId));
    setConfirmDeleteId(null);
    // If deleted scenario was selected, fall back to first scenario
  };

  const addScenario = async () => {
    if (!newTitle.trim()) return;
    const docRef = await addDoc(collection(db, 'users', uid, 'scenarios'), {
      title: newTitle.trim(),
      description: newDesc.trim(),
      isDefault: false,
      createdAt: serverTimestamp(),
    });
    setIsAdding(false);
    setNewTitle('');
    setNewDesc('');
    onSelect(docRef.id);
  };

  const inputStyle = {
    width: '100%', padding: '8px 10px', borderRadius: '6px', fontSize: '0.85rem',
    background: 'var(--input-bg)', color: 'inherit', border: '1px solid var(--input-border)',
    boxSizing: 'border-box', marginBottom: '6px',
  };

  return (
    <div className="scenario-manager">
      <div className="scenario-manager-header">
        <span>📋 My Scenarios</span>
        <button className="scenario-add-btn" onClick={() => setIsAdding(true)} title="Add new scenario">
          +
        </button>
      </div>

      {isAdding && (
        <div className="scenario-card scenario-card-new">
          <input
            style={inputStyle}
            placeholder="Scenario title (e.g., Performance Review)"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            autoFocus
          />
          <textarea
            style={{ ...inputStyle, height: '70px', resize: 'vertical' }}
            placeholder="Describe the scenario context..."
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-primary" style={{ flex: 1, padding: '6px', fontSize: '0.8rem' }} onClick={addScenario}>
              Save
            </button>
            <button className="scenario-btn-ghost" onClick={() => { setIsAdding(false); setNewTitle(''); setNewDesc(''); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="scenario-list">
        {scenarios.map(s => (
          <div
            key={s.firestoreId}
            className={`scenario-card ${selectedFsId === s.firestoreId ? 'scenario-card-selected' : ''}`}
            onClick={() => editingId !== s.firestoreId && onSelect(s.firestoreId)}
          >
            {editingId === s.firestoreId ? (
              <div onClick={e => e.stopPropagation()}>
                <input
                  style={inputStyle}
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  autoFocus
                />
                <textarea
                  style={{ ...inputStyle, height: '60px', resize: 'vertical' }}
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button className="btn-primary" style={{ flex: 1, padding: '5px', fontSize: '0.78rem' }} onClick={() => saveEdit(s.firestoreId)}>
                    ✓ Save
                  </button>
                  {s.isDefault && (
                    <button className="scenario-btn-ghost" style={{ fontSize: '0.78rem' }} onClick={() => restoreDefault(s)}>
                      ↩ Restore
                    </button>
                  )}
                  <button className="scenario-btn-ghost" style={{ fontSize: '0.78rem' }} onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="scenario-card-title">
                  {s.isDefault && <span className="scenario-default-badge">default</span>}
                  {s.title}
                </div>
                <div className="scenario-card-desc">{s.description}</div>
                <div className="scenario-card-actions" onClick={e => e.stopPropagation()}>
                  <button className="scenario-icon-btn" title="Edit" onClick={() => startEdit(s)}>✏️</button>
                  {confirmDeleteId === s.firestoreId ? (
                    <>
                      <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Delete?</span>
                      <button className="scenario-icon-btn scenario-btn-danger" onClick={() => deleteScenario(s.firestoreId)}>Yes</button>
                      <button className="scenario-icon-btn" onClick={() => setConfirmDeleteId(null)}>No</button>
                    </>
                  ) : (
                    <button className="scenario-icon-btn scenario-btn-danger" title="Delete" onClick={() => setConfirmDeleteId(s.firestoreId)}>🗑️</button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
