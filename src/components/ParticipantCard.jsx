import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, Modal, Keyboard,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import api from '../api/client';
import { getAvatarColor } from '../utils/avatarColor';

const ParticipantCard = memo(function ParticipantCard({ participant, items, allParticipants, sessionId, onUpdate, onEditingChange }) {
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newAmt, setNewAmt] = useState('');
  const [newShared, setNewShared] = useState([]);
  const [shareItem, setShareItem] = useState(null);
  const editRef = useRef(null);

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
    }
  }, [editing]);

  const myItems = useMemo(() => items.filter(i => i.paidByParticipantId === participant.id), [items, participant.id]);

  const startEdit = useCallback((field, current) => {
    setEditing(field);
    setEditVal(current);
    onEditingChange(true);
  }, [onEditingChange]);

  const saveEdit = useCallback(async () => {
    if (!editing) return;
    const val = editVal.trim();
    if (!val) { setEditing(null); onEditingChange(false); return; }

    try {
      if (editing.type === 'name') {
        await api.put(`/sessions/${sessionId}/participants/${participant.id}`, { name: val });
      } else if (editing.type === 'desc') {
        await api.put(`/sessions/${sessionId}/items/${editing.itemId}`, {
          ...editing.orig,
          description: val,
        });
      } else if (editing.type === 'amount') {
        const num = parseFloat(val);
        if (isNaN(num) || num <= 0) { setEditing(null); onEditingChange(false); return; }
        await api.put(`/sessions/${sessionId}/items/${editing.itemId}`, {
          ...editing.orig,
          amount: num,
        });
      }
      setEditing(null);
      onEditingChange(false);
      onUpdate();
    } catch (e) {
      Alert.alert('Error', 'Failed to save');
      setEditing(null);
      onEditingChange(false);
    }
  }, [editing, editVal, onEditingChange, onUpdate, sessionId, participant.id]);

  const deleteItem = useCallback((item) => {
    Alert.alert(
      'Delete Expense',
      `Delete "${item.description}" — $${Number(item.amount).toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/sessions/${sessionId}/items/${item.id}`);
            onUpdate();
          } catch { Alert.alert('Error', 'Failed to delete'); }
        }},
      ]
    );
  }, [sessionId, onUpdate]);

  const addExpense = useCallback(async () => {
    if (!newDesc.trim() || !newAmt) return;
    const amount = parseFloat(newAmt);
    if (isNaN(amount) || amount <= 0) { Alert.alert('Invalid', 'Enter a valid amount'); return; }
    try {
      const body = {
        paidByParticipantId: participant.id,
        description: newDesc.trim(),
        amount,
      };
      if (newShared.length > 0) body.sharedWithParticipantIds = newShared;
      await api.post(`/sessions/${sessionId}/items`, body);
      setNewDesc(''); setNewAmt(''); setNewShared([]); setShowAdd(false);
      onEditingChange(false);
      onUpdate();
    } catch (e) {
      Alert.alert('Error', 'Failed to add expense');
    }
  }, [newDesc, newAmt, newShared, participant.id, sessionId, onEditingChange, onUpdate]);

  const toggleShare = useCallback((pid) => {
    setNewShared(prev =>
      prev.includes(pid) ? prev.filter(p => p !== pid) : [...prev, pid]
    );
  }, []);

  const toggleItemShare = useCallback(async (item, pid) => {
    const current = item.sharedWithParticipantIds?.length ? item.sharedWithParticipantIds : [];
    const updated = current.includes(pid)
      ? current.filter(p => p !== pid)
      : [...current, pid];
    try {
      await api.put(`/sessions/${sessionId}/items/${item.id}`, {
        paidByParticipantId: item.paidByParticipantId,
        description: item.description,
        amount: item.amount,
        sharedWithParticipantIds: updated,
      });
      onUpdate();
    } catch (e) { Alert.alert('Error', 'Failed to update sharing'); }
  }, [sessionId, onUpdate]);

  const allParticipantIds = useMemo(() => allParticipants.map(p => p.id), [allParticipants]);
  const shareItemData = useMemo(() => items.find(i => i.id === shareItem), [items, shareItem]);

  const initial = useMemo(() => (participant.name || '?')[0].toUpperCase(), [participant.name]);

  const avatarColor = useMemo(() => getAvatarColor(participant.name || ''), [participant.name]);

  const totalSpent = useMemo(
    () => myItems.reduce((sum, i) => sum + Number(i.amount), 0),
    [myItems]
  );

  return (
    <View style={styles.card}>
      {/* Header: avatar + editable name + total spent */}
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: avatarColor.bg }]}>
          <Text style={[styles.avatarText, { color: avatarColor.text }]}>{initial}</Text>
        </View>
        <View style={styles.nameArea}>
          {editing?.type === 'name' ? (
            <TextInput
              ref={editRef}
              style={styles.nameInput}
              value={editVal}
              onChangeText={setEditVal}
              onBlur={saveEdit}
              onSubmitEditing={saveEdit}
              selectTextOnFocus
            />
          ) : (
            <TouchableOpacity onPress={() => startEdit({ type: 'name' }, participant.name)}>
              <Text style={styles.nameText}>{participant.name}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.totalTag}>
          <Text style={styles.totalTagIcon}>$</Text>
          <Text style={styles.totalTagAmount}>{Number(totalSpent).toFixed(2)}</Text>
        </View>
      </View>

      {/* Expenses list */}
      {myItems.length > 0 && (
        <View style={styles.expensesList}>
          {myItems.map(item => (
            <Swipeable
              key={item.id}
              renderRightActions={() => (
                <TouchableOpacity
                  style={styles.swipeDeleteAction}
                  onPress={() => deleteItem(item)}
                >
                  <Text style={styles.swipeDeleteText}>Delete</Text>
                </TouchableOpacity>
              )}
              overshootRight={false}
            >
              <View style={styles.expenseRow}>
                <View style={styles.expenseLeft}>
                  {editing?.type === 'desc' && editing?.itemId === item.id ? (
                    <TextInput
                      ref={editRef}
                      style={styles.inlineInput}
                      value={editVal}
                      onChangeText={setEditVal}
                      onBlur={saveEdit}
                      onSubmitEditing={saveEdit}
                      selectTextOnFocus
                    />
                  ) : (
                    <TouchableOpacity onPress={() => startEdit({ type: 'desc', itemId: item.id, orig: item }, item.description)}>
                      <Text style={styles.descText} numberOfLines={1}>{item.description}</Text>
                    </TouchableOpacity>
                  )}
                  <View style={styles.expenseMeta}>
                    {editing?.type === 'amount' && editing?.itemId === item.id ? (
                      <TextInput
                        ref={editRef}
                        style={[styles.inlineInput, styles.amtInput]}
                        value={editVal}
                        onChangeText={setEditVal}
                        onBlur={saveEdit}
                        onSubmitEditing={saveEdit}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                      />
                    ) : (
                      <TouchableOpacity onPress={() => startEdit({ type: 'amount', itemId: item.id, orig: item }, String(item.amount))}>
                        <Text style={styles.amtText}>${Number(item.amount).toFixed(2)}</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.shareBadge}
                      onPress={() => setShareItem(shareItem === item.id ? null : item.id)}
                    >
                      <Text style={styles.shareText}>
                        {(item.sharedWithParticipantIds?.length ? item.sharedWithParticipantIds : allParticipantIds).length}/{allParticipants.length}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity onPress={() => deleteItem(item)} style={styles.deleteBtn}>
                  <Text style={styles.deleteText}>✕</Text>
                </TouchableOpacity>
              </View>
            </Swipeable>
          ))}
        </View>
      )}

      {/* Share modal for an item */}
      <Modal visible={shareItem !== null} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShareItem(null)}>
          <View style={styles.shareModal}>
            <Text style={styles.shareTitle}>Split with</Text>
            {allParticipants.map(p => {
              const checked = shareItemData ? (shareItemData.sharedWithParticipantIds?.length ? shareItemData.sharedWithParticipantIds : allParticipantIds).includes(p.id) : false;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={styles.shareRow}
                  onPress={() => shareItemData && toggleItemShare(shareItemData, p.id)}
                >
                  <Text style={styles.shareName}>{p.name}</Text>
                  <View style={[styles.checkbox, checked && styles.checked]}>
                    {checked && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add expense form */}
      {showAdd ? (
        <View style={styles.addForm}>
          <TextInput
            style={styles.addInput}
            placeholder="Description"
            placeholderTextColor="#94a3b8"
            value={newDesc}
            onChangeText={setNewDesc}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />
          <TextInput
            style={styles.addInput}
            placeholder="Amount"
            placeholderTextColor="#94a3b8"
            keyboardType="decimal-pad"
            value={newAmt}
            onChangeText={setNewAmt}
          />
          <Text style={styles.splitLabel}>Split with</Text>
          <View style={styles.chipRow}>
            {allParticipants.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[styles.chip, newShared.includes(p.id) && styles.chipActive]}
                onPress={() => toggleShare(p.id)}
              >
                <Text style={[styles.chipText, newShared.includes(p.id) && styles.chipTextActive]}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.addActions}>
              <TouchableOpacity onPress={() => { setShowAdd(false); setNewDesc(''); setNewAmt(''); setNewShared([]); onEditingChange(false); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            <TouchableOpacity onPress={addExpense} style={styles.addBtn}>
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.addExpBtn} onPress={() => { setShowAdd(true); onEditingChange(true); }}>
          <Text style={styles.addExpText}>+ Add Expense</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

export default ParticipantCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  avatarText: { fontSize: 16, fontWeight: '700' },
  nameArea: { flex: 1 },
  nameText: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  nameInput: {
    fontSize: 17, fontWeight: '700', color: '#1e293b',
    borderBottomWidth: 2, borderBottomColor: '#0ea5e9', paddingVertical: 2,
  },
  expensesList: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 6 },
  expenseRow: {
    flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6,
  },
  expenseLeft: { flex: 1 },
  descText: { fontSize: 14, color: '#1e293b', fontWeight: '500' },
  expenseMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 8 },
  inlineInput: {
    fontSize: 14, color: '#1e293b', fontWeight: '500',
    borderBottomWidth: 1, borderBottomColor: '#0ea5e9', paddingVertical: 1,
    maxWidth: 160,
  },
  amtInput: { textAlign: 'right', minWidth: 70 },
  amtText: { fontSize: 13, fontWeight: '700', color: '#0ea5e9' },
  shareBadge: {
    backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  shareText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  totalTag: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f1f5f9', borderRadius: 12,
    paddingVertical: 4, paddingHorizontal: 10, gap: 4,
  },
  totalTagIcon: { fontSize: 11, color: '#0ea5e9', fontWeight: '800' },
  totalTagAmount: { fontSize: 14, fontWeight: '700', color: '#0ea5e9' },
  deleteBtn: { padding: 6, marginLeft: 8 },
  deleteText: { fontSize: 14, color: '#ef4444' },
  addForm: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  addInput: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 12, fontSize: 14,
    backgroundColor: '#f8fafc', marginBottom: 8,
  },
  splitLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 10 },
  chip: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16,
    borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  chipText: { fontSize: 12, color: '#475569' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  addActions: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  cancelText: { fontSize: 14, color: '#94a3b8', fontWeight: '600', paddingVertical: 8 },
  addBtn: { backgroundColor: '#0ea5e9', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 20 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  addExpBtn: {
    marginTop: 8, borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed',
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  addExpText: { fontSize: 13, color: '#0ea5e9', fontWeight: '600' },
  swipeDeleteAction: {
    backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center',
    width: 80, borderRadius: 8, marginVertical: 4,
  },
  swipeDeleteText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  overlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  shareModal: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '75%',
    maxHeight: '60%',
  },
  shareTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  shareRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  shareName: { fontSize: 15, color: '#1e293b' },
  checkbox: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: '#cbd5e1',
    justifyContent: 'center', alignItems: 'center',
  },
  checked: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
