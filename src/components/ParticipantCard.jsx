import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, Modal, Keyboard, ScrollView,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import api from '../api/client';
import { getAvatarColor } from '../utils/avatarColor';

const ParticipantCard = memo(function ParticipantCard({ participant, items, allParticipants, sessionId, onItemAdded, onItemUpdated, onItemDeleted, onParticipantUpdated, onEditingChange }) {
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newAmt, setNewAmt] = useState('');
  const [newShared, setNewShared] = useState([]);
  const [shareItem, setShareItem] = useState(null);
  const [showAddShare, setShowAddShare] = useState(false);
  const [shareSelections, setShareSelections] = useState(null);
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
        if (onParticipantUpdated) onParticipantUpdated(participant.id, { name: val });
      } else if (editing.type === 'desc') {
        await api.put(`/sessions/${sessionId}/items/${editing.itemId}`, {
          ...editing.orig,
          description: val,
        });
        if (onItemUpdated) onItemUpdated(editing.itemId, { description: val });
      } else if (editing.type === 'amount') {
        const num = parseFloat(val);
        if (isNaN(num) || num <= 0) { setEditing(null); onEditingChange(false); return; }
        await api.put(`/sessions/${sessionId}/items/${editing.itemId}`, {
          ...editing.orig,
          amount: num,
        });
        if (onItemUpdated) onItemUpdated(editing.itemId, { amount: num });
      }
      setEditing(null);
      onEditingChange(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to save');
      setEditing(null);
      onEditingChange(false);
    }
  }, [editing, editVal, onEditingChange, sessionId, participant.id, onItemUpdated, onParticipantUpdated]);

  const deleteItem = useCallback((item) => {
    Alert.alert(
      'Delete Expense',
      `Delete "${item.description || 'No description'}" — $${Number(item.amount).toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/sessions/${sessionId}/items/${item.id}`);
            if (onItemDeleted) onItemDeleted(item.id);
          } catch { Alert.alert('Error', 'Failed to delete'); }
        }},
      ]
    );
  }, [sessionId, onItemDeleted]);

  const addExpense = useCallback(async () => {
    if (!newAmt) return;
    const amount = parseFloat(newAmt);
    if (isNaN(amount) || amount <= 0) { Alert.alert('Invalid', 'Enter a valid amount'); return; }
    try {
      const body = {
        paidByParticipantId: participant.id,
        description: newDesc.trim() || '',
        amount,
      };
      if (newShared.length > 0) body.sharedWithParticipantIds = newShared;
      const { data } = await api.post(`/sessions/${sessionId}/items`, body);
      setNewDesc(''); setNewAmt(''); setNewShared([]); setShowAdd(false);
      onEditingChange(false);
      if (onItemAdded) onItemAdded(data);
    } catch (e) {
      Alert.alert('Error', 'Failed to add expense');
    }
  }, [newDesc, newAmt, newShared, participant.id, sessionId, onEditingChange, onItemAdded]);

  const toggleShare = useCallback((pid) => {
    setNewShared(prev =>
      prev.includes(pid) ? prev.filter(p => p !== pid) : [...prev, pid]
    );
  }, []);

  const allParticipantIds = useMemo(() => allParticipants.map(p => p.id), [allParticipants]);
  const shareItemData = useMemo(() => items.find(i => i.id === shareItem), [items, shareItem]);

  useEffect(() => {
    if (shareItemData) {
      setShareSelections(
        shareItemData.sharedWithParticipantIds?.length
          ? [...shareItemData.sharedWithParticipantIds]
          : [...allParticipantIds]
      );
    } else {
      setShareSelections(null);
    }
  }, [shareItemData, allParticipantIds]);

  const toggleLocalShare = useCallback((pid) => {
    setShareSelections(prev => {
      if (!prev) return prev;
      return prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid];
    });
  }, []);

  const closeShareModal = useCallback(async () => {
    const item = shareItemData;
    if (item && shareSelections) {
      try {
        await api.put(`/sessions/${sessionId}/items/${item.id}`, {
          paidByParticipantId: item.paidByParticipantId,
          description: item.description,
          amount: item.amount,
          sharedWithParticipantIds: shareSelections,
        });
        if (onItemUpdated) onItemUpdated(item.id, { sharedWithParticipantIds: shareSelections });
      } catch (e) { Alert.alert('Error', 'Failed to update sharing'); }
    }
    setShareItem(null);
    setShareSelections(null);
  }, [shareItemData, shareSelections, sessionId, onItemUpdated]);

  const initial = useMemo(() => (participant.name || '?')[0].toUpperCase(), [participant.name]);
  const avatarColor = useMemo(() => getAvatarColor(participant.name || ''), [participant.name]);
  const totalSpent = useMemo(
    () => myItems.reduce((sum, i) => sum + Number(i.amount), 0),
    [myItems]
  );

  return (
    <View style={styles.card}>
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
                <View style={styles.expenseDescArea}>
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
                    <TouchableOpacity
                      style={styles.descTouch}
                      onPress={() => startEdit({ type: 'desc', itemId: item.id, orig: item }, item.description)}
                    >
                      <Text style={styles.descText} numberOfLines={1}>
                        {item.description || <Text style={styles.noDescText}>No description</Text>}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.expenseRight}>
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
                    <TouchableOpacity
                      style={styles.amtTouch}
                      onPress={() => startEdit({ type: 'amount', itemId: item.id, orig: item }, String(item.amount))}
                    >
                      <Text style={styles.amtText}>${Number(item.amount).toFixed(2)}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.shareBadge}
                    onPress={() => setShareItem(shareItem === item.id ? null : item.id)}
                  >
                    <Text style={styles.shareText}>
                      {(!item.sharedWithParticipantIds?.length || item.sharedWithParticipantIds.length === allParticipants.length) ? 'ALL' : `${item.sharedWithParticipantIds.length}/${allParticipants.length}`}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteItem(item)} style={styles.deleteBtn}>
                    <Text style={styles.deleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Swipeable>
          ))}
        </View>
      )}

      <Modal visible={shareItem !== null} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeShareModal}>
          <View style={styles.shareModal}>
            <Text style={styles.shareTitle}>Split with</Text>
            <ScrollView style={styles.shareGrid}>
              <View style={styles.shareGridRow}>
                {allParticipants.map(p => {
                  const checked = shareSelections ? shareSelections.includes(p.id) : false;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.shareGridItem}
                      onPress={() => toggleLocalShare(p.id)}
                    >
                      <View style={[styles.shareCheckbox, checked && styles.shareCheckboxChecked]}>
                        {checked && <Text style={styles.shareCheckMark}>✓</Text>}
                      </View>
                      <Text style={styles.shareGridName} numberOfLines={1}>{p.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showAddShare} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowAddShare(false)}>
          <View style={styles.shareModal}>
            <Text style={styles.shareTitle}>Split with</Text>
            <ScrollView style={styles.shareGrid}>
              <View style={styles.shareGridRow}>
                {allParticipants.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.shareGridItem}
                    onPress={() => toggleShare(p.id)}
                  >
                    <View style={[styles.shareCheckbox, newShared.includes(p.id) && styles.shareCheckboxChecked]}>
                      {newShared.includes(p.id) && <Text style={styles.shareCheckMark}>✓</Text>}
                    </View>
                    <Text style={styles.shareGridName} numberOfLines={1}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {showAdd ? (
        <View style={styles.addForm}>
          <View style={styles.addRow}>
            <TextInput
              style={styles.addDescInput}
              placeholder="Description (optional)"
              placeholderTextColor="#94a3b8"
              value={newDesc}
              onChangeText={setNewDesc}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
            <TextInput
              style={styles.addAmtInput}
              placeholder="$ 0.00"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
              value={newAmt}
              onChangeText={setNewAmt}
            />
          </View>
          <View style={styles.splitRow}>
            <Text style={styles.splitLabel}>Split with</Text>
            <TouchableOpacity style={styles.splitBtn} onPress={() => setShowAddShare(true)}>
              <Text style={styles.splitBtnText}>
                {newShared.length === 0 || newShared.length === allParticipants.length
                  ? 'ALL'
                  : `${newShared.length}/${allParticipants.length}`}
              </Text>
            </TouchableOpacity>
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
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
  },
  expenseDescArea: { flex: 1, marginRight: 8 },
  descTouch: { flexShrink: 1 },
  descText: { fontSize: 14, color: '#1e293b', fontWeight: '500' },
  noDescText: { fontSize: 14, color: '#94a3b8', fontStyle: 'italic' },
  expenseRight: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  inlineInput: {
    fontSize: 14, color: '#1e293b', fontWeight: '500',
    borderBottomWidth: 1, borderBottomColor: '#0ea5e9', paddingVertical: 1,
  },
  amtTouch: { },
  amtInput: { textAlign: 'right', minWidth: 70 },
  amtText: { fontSize: 13, fontWeight: '700', color: '#0ea5e9' },
  shareBadge: {
    backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
    marginLeft: 6,
  },
  shareText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  totalTag: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f1f5f9', borderRadius: 12,
    paddingVertical: 4, paddingHorizontal: 10, gap: 4,
  },
  totalTagIcon: { fontSize: 11, color: '#0ea5e9', fontWeight: '800' },
  totalTagAmount: { fontSize: 14, fontWeight: '700', color: '#0ea5e9' },
  deleteBtn: { padding: 6, marginLeft: 4 },
  deleteText: { fontSize: 14, color: '#ef4444' },
  addForm: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  addDescInput: {
    flex: 1,
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 12, fontSize: 14,
    backgroundColor: '#f8fafc',
  },
  addAmtInput: {
    width: 100,
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 12, fontSize: 14,
    backgroundColor: '#f8fafc', textAlign: 'right',
  },
  splitRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  splitLabel: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  splitBtn: {
    backgroundColor: '#f1f5f9', borderRadius: 10,
    paddingVertical: 6, paddingHorizontal: 14,
  },
  splitBtnText: { fontSize: 12, color: '#0ea5e9', fontWeight: '700' },
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
  shareGrid: { maxHeight: 300 },
  shareGridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  shareGridItem: {
    width: '30%', flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 6, gap: 6,
    marginBottom: 2,
  },
  shareCheckbox: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#cbd5e1',
    justifyContent: 'center', alignItems: 'center',
  },
  shareCheckboxChecked: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  shareCheckMark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  shareGridName: { fontSize: 12, color: '#1e293b', fontWeight: '500', flexShrink: 1 },
});
