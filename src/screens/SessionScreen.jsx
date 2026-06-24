import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, Share,
  Keyboard, Pressable, Image, Modal, FlatList,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import api from '../api/client';
import { APP_BASE_URL } from '../config';
import ParticipantCard from '../components/ParticipantCard';
import { getAvatarColor } from '../utils/avatarColor';
import { saveSession, saveSessionData, getSessionData } from '../utils/sessionCache';

const EMPTY_ITEMS = [];
const keyExtractor = (item) => item.id;

export default function SessionScreen({ route, navigation }) {
  const { sessionId } = route.params;
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settlement, setSettlement] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [editCount, setEditCount] = useState(0);
  const [settlementDismissed, setSettlementDismissed] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const handleEditingChange = useCallback((editing) => {
    setEditCount(prev => editing ? prev + 1 : Math.max(0, prev - 1));
    if (editing) setSettlementDismissed(true);
  }, []);

  const handleRecalculate = useCallback(async () => {
    setSettlementDismissed(false);
    setCalcLoading(true);
    try {
      const { data } = await api.post(`/sessions/${sessionId}/calculate`);
      setSettlement(data);
    } catch {} finally {
      setCalcLoading(false);
    }
  }, [sessionId]);

  const fetch = useCallback(async () => {
    try {
      const { data } = await api.get(`/sessions/${sessionId}`);
      setSession(data);
      saveSessionData(sessionId, data);
      saveSession(data);
      if (data.items.length > 0 && !settlement) {
        api.post(`/sessions/${sessionId}/calculate`).then(({ data: sd }) => {
          setSettlement(sd);
        }).catch(() => {});
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [sessionId, settlement]);

  useEffect(() => {
    getSessionData(sessionId).then(cached => {
      if (cached) {
        setSession(cached);
        setLoading(false);
      }
    });
    fetch();
  }, [fetch, sessionId]);

  const calculate = useCallback(async () => {
    setCalcLoading(true);
    try {
      const { data } = await api.post(`/sessions/${sessionId}/calculate`);
      setSettlement(data);
    } catch {} finally {
      setCalcLoading(false);
    }
  }, [sessionId]);

  const handleLeave = useCallback(() => navigation.popToTop(), [navigation]);

  const shortUrl = useMemo(
    () => session?.shortCode ? `${APP_BASE_URL}/s/${session.shortCode}` : null,
    [session?.shortCode]
  );

  const shareSessionFallback = useCallback(async () => {
    const link = shortUrl || `${APP_BASE_URL}/session/${sessionId}`;
    await Clipboard.setStringAsync(link);
    Alert.alert('Link Copied', `Session link copied to clipboard!\n\n${link}`);
  }, [shortUrl, sessionId]);

  const shareSession = useCallback(async () => {
    const link = shortUrl || `${APP_BASE_URL}/session/${sessionId}`;
    try {
      await Share.share({
        message: `Join my Bill Splitter session: ${link}`,
      });
    } catch {
      await shareSessionFallback();
    }
  }, [shortUrl, sessionId, shareSessionFallback]);

  const sortedParticipants = useMemo(() => {
    const participants = session?.participants ?? [];
    return [...participants].sort((a, b) => a.displayOrder - b.displayOrder);
  }, [session?.participants]);

  const itemsByParticipant = useMemo(() => {
    const all = session?.items ?? EMPTY_ITEMS;
    const map = {};
    for (const item of all) {
      const arr = map[item.paidByParticipantId];
      if (arr) arr.push(item);
      else map[item.paidByParticipantId] = [item];
    }
    return map;
  }, [session?.items]);

  const handleItemAdded = useCallback((item) => {
    setSession(prev => {
      if (!prev) return prev;
      return { ...prev, items: [...prev.items, item] };
    });
    saveSessionData(sessionId, { ...session, items: [...(session?.items || []), item] });
  }, [sessionId, session]);

  const handleItemUpdated = useCallback((itemId, changes) => {
    setSession(prev => {
      if (!prev) return prev;
      const items = prev.items.map(i => i.id === itemId ? { ...i, ...changes } : i);
      return { ...prev, items };
    });
  }, []);

  const handleItemDeleted = useCallback((itemId) => {
    setSession(prev => {
      if (!prev) return prev;
      const items = prev.items.filter(i => i.id !== itemId);
      return { ...prev, items };
    });
  }, []);

  const handleParticipantUpdated = useCallback((participantId, changes) => {
    setSession(prev => {
      if (!prev) return prev;
      const participants = prev.participants.map(p => p.id === participantId ? { ...p, ...changes } : p);
      return { ...prev, participants };
    });
  }, []);

  const renderItem = useCallback(({ item }) => (
    <ParticipantCard
      participant={item}
      items={itemsByParticipant[item.id] ?? EMPTY_ITEMS}
      allParticipants={sortedParticipants}
      sessionId={sessionId}
      onItemAdded={handleItemAdded}
      onItemUpdated={handleItemUpdated}
      onItemDeleted={handleItemDeleted}
      onParticipantUpdated={handleParticipantUpdated}
      onEditingChange={handleEditingChange}
    />
  ), [itemsByParticipant, sortedParticipants, sessionId, handleItemAdded, handleItemUpdated, handleItemDeleted, handleParticipantUpdated, handleEditingChange]);

  const debtsContent = useMemo(() => {
    if (!settlement?.debts?.length) return null;
    const activeNames = new Set(sortedParticipants.map(p => p.name));
    const activeDebts = settlement.debts.filter(
      d => activeNames.has(d.fromParticipantName) && activeNames.has(d.toParticipantName)
    );
    if (!activeDebts.length) return null;
    return activeDebts.map((d, i) => {
      const fromColor = getAvatarColor(d.fromParticipantName);
      const toColor = getAvatarColor(d.toParticipantName);
      return (
        <View key={i} style={styles.debtRow}>
          <View style={styles.debtSide}>
            <View style={[styles.debtAvatar, { backgroundColor: fromColor.bg }]}><Text style={styles.debtAvatarText}>{d.fromParticipantName[0]}</Text></View>
            <Text style={styles.debtName} numberOfLines={1}>{d.fromParticipantName}</Text>
          </View>
          <View style={styles.debtCenter}>
            <Text style={styles.debtLabel}>pays</Text>
            <Text style={styles.debtAmountText}>${Number(d.amount).toFixed(2)}</Text>
            <Text style={styles.debtLabel}>to</Text>
            <View style={styles.spacer6} />
          </View>
          <View style={styles.debtSideRight}>
            <View style={[styles.debtAvatar, { backgroundColor: toColor.bg }]}><Text style={styles.debtAvatarText}>{d.toParticipantName[0]}</Text></View>
            <Text style={styles.debtName} numberOfLines={1}>{d.toParticipantName}</Text>
          </View>
        </View>
      );
    });
  }, [settlement?.debts, sortedParticipants]);

  if (loading && !session) return <ActivityIndicator style={styles.loadingIndicator} />;
  if (!session) return <Text style={styles.notFound}>Session not found</Text>;

  return (
    <View style={styles.container}>
    <FlatList
      style={styles.flatList}
      contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetch} />}
      data={sortedParticipants}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      removeClippedSubviews={true}
      windowSize={5}
      maxToRenderPerBatch={10}
      initialNumToRender={5}
      ListHeaderComponent={
        <View>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.sessionName} numberOfLines={1}>{session.name}</Text>
              <TouchableOpacity onPress={handleLeave} style={styles.leaveBtn}>
                <Text style={styles.leaveText}>Leave</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.headerBadges}>
              <View style={styles.badge}>
                <View style={styles.dot} />
                <Text style={styles.badgeText}>{session.participants?.length || 0} Participants</Text>
              </View>
              <View style={[styles.saveBadge, editCount > 0 ? styles.unsavedBadge : styles.savedBadge]}>
                <Text style={[styles.saveBadgeText, editCount > 0 ? styles.unsavedText : styles.savedText]}>
                  {editCount > 0 ? 'Unsaved' : 'Saved'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      }
      ListFooterComponent={
        <View>
          <View style={styles.settleSection}>
            {settlementDismissed ? (
              <View style={styles.settlePrompt}>
                <Text style={styles.settlePromptTitle}>Resettlement needed</Text>
                <Text style={styles.settlePromptSub}>New changes detected. Tap Recalculate to update.</Text>
                <TouchableOpacity style={styles.calcBtn} onPress={handleRecalculate} disabled={calcLoading}>
                  <Text style={styles.calcBtnText}>{calcLoading ? 'Recalculating...' : 'Recalculate'}</Text>
                </TouchableOpacity>
              </View>
            ) : settlement ? (
              <View style={styles.settleCard}>
                <Text style={styles.settleTotal}>Total: ${Number(settlement.totalExpenses).toFixed(2)}</Text>
                {debtsContent !== null ? (
                  debtsContent
                ) : (
                  <Text style={styles.settleEmpty}>Everything is already settled!</Text>
                )}
                <TouchableOpacity style={styles.recalcBtn} onPress={calculate} disabled={calcLoading}>
                  <Text style={styles.recalcText}>{calcLoading ? 'Recalculating...' : 'Recalculate'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.settlePrompt}>
                <Text style={styles.settlePromptTitle}>Ready to settle up?</Text>
                <Text style={styles.settlePromptSub}>Calculate who owes whom.</Text>
                <View style={styles.settleActions}>
                  <TouchableOpacity style={styles.shareBtn} onPress={shareSession}>
                    <Text style={styles.shareBtnText}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.calcBtn} onPress={calculate} disabled={calcLoading}>
                    <Text style={styles.calcBtnText}>{calcLoading ? 'Calculating...' : 'Calculate Debts'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
          {session.shortCode && (
            <View style={styles.shareCard}>
              <Text style={styles.shareCardTitle}>Share with Friends</Text>
              <View style={styles.shareCardRow}>
                <TouchableOpacity onPress={async () => { await Clipboard.setStringAsync(shortUrl); Alert.alert('Link copied!'); }} style={styles.shareCardUrl}>
                  <Text style={styles.shareCardUrlText} numberOfLines={1}>{shortUrl}</Text>
                </TouchableOpacity>
                <View style={styles.shareCardActions}>
                  <TouchableOpacity onPress={shareSession} style={styles.shareIconBtn}>
                    <Text style={styles.shareIconText}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowQR(true)} style={styles.shareIconBtn}>
                    <Text style={styles.shareIconText}>QR</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      }
    />
      <Modal visible={showQR} transparent animationType="fade">
        <Pressable style={styles.qrOverlay} onPress={() => setShowQR(false)}>
          <Pressable style={styles.qrModal}>
            <Text style={styles.qrTitle}>Share Session</Text>
            <Image
              source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shortUrl)}` }}
              style={styles.qrImage}
            />
            <Text style={styles.qrUrl}>{shortUrl}</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingIndicator: { marginTop: 60 },
  notFound: { textAlign: 'center', marginTop: 60, color: '#94a3b8' },
  flatList: { flex: 1 },
  header: {
    paddingHorizontal: 16, paddingVertical: 14,
    marginBottom: 8,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionName: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', flex: 1, marginRight: 12 },
  leaveBtn: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: 14,
  },
  leaveText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  headerBadges: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  badgeText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  shareCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 4,
    marginBottom: 32,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  shareCardTitle: { fontSize: 15, fontWeight: '700', color: '#334155', marginBottom: 10 },
  shareCardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shareCardUrl: {
    backgroundColor: '#e0f2fe', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    flex: 1, marginRight: 10, overflow: 'hidden',
  },
  shareCardUrlText: { fontSize: 11, fontFamily: 'monospace', color: '#0ea5e9', fontWeight: '600' },
  shareCardActions: { flexDirection: 'row', gap: 8, flexShrink: 0 },
  shareIconBtn: {
    backgroundColor: '#0ea5e9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  shareIconText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  grid: { padding: 12 },
  settleSection: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 },

  settleCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  settleTotal: {
    fontSize: 16, fontWeight: 'bold', color: '#059669', textAlign: 'center', marginBottom: 8,
  },
  debtRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 3,
  },
  debtSide: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  debtSideRight: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end', flexShrink: 1 },
  debtCenter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  spacer6: { width: 6 },
  debtName: { fontSize: 13, fontWeight: '600', color: '#1e293b', flexShrink: 1 },
  debtAmountText: { fontSize: 12, fontWeight: '600', color: '#0ea5e9' },
  debtLabel: { fontSize: 11, color: '#94a3b8' },
  debtAvatar: {
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },
  debtAvatarText: { fontSize: 10, fontWeight: '700', color: '#1e293b' },
  settleActions: {
    flexDirection: 'row', gap: 8, marginTop: 8,
  },
  shareBtn: {
    flex: 1, borderWidth: 1, borderColor: '#0ea5e9', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  shareBtnText: { color: '#0ea5e9', fontSize: 14, fontWeight: '600' },
  recalcBtn: {
    alignSelf: 'center', marginTop: 8,
    borderWidth: 1, borderColor: '#0ea5e9', borderRadius: 6,
    paddingVertical: 6, paddingHorizontal: 20, alignItems: 'center',
  },
  recalcText: { color: '#0ea5e9', fontSize: 12, fontWeight: '600' },
  settleEmpty: { textAlign: 'center', color: '#94a3b8', fontSize: 13, paddingVertical: 8 },
  settlePrompt: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  settlePromptTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  settlePromptSub: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  calcBtn: {
    flex: 1, backgroundColor: '#0ea5e9', paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 10, alignItems: 'center',
  },
  calcBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  qrOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  qrModal: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center',
    width: '80%', maxWidth: 320,
  },
  qrTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  qrImage: { width: 200, height: 200, borderRadius: 8, marginBottom: 12 },
  qrUrl: { fontSize: 12, fontFamily: 'monospace', color: '#64748b', textAlign: 'center' },
  saveBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 4 },
  unsavedBadge: { backgroundColor: '#fff7ed' },
  savedBadge: { backgroundColor: '#f0fdf4' },
  saveBadgeText: { fontSize: 10, fontWeight: '700' },
  unsavedText: { color: '#ea580c' },
  savedText: { color: '#16a34a' },
});
