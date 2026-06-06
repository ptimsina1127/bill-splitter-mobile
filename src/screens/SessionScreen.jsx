import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, Share,
  Keyboard, Pressable, Image, Modal,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import api from '../api/client';
import { APP_BASE_URL } from '../config';
import ParticipantCard from '../components/ParticipantCard';

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
      if (data.items.length > 0) {
        try {
          const { data: settlementData } = await api.post(`/sessions/${sessionId}/calculate`);
          setSettlement(settlementData);
        } catch {}
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { fetch(); }, [fetch]);

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

  const shortUrl = session?.shortCode ? `${APP_BASE_URL}/s/${session.shortCode}` : null;

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

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} />;
  if (!session) return <Text style={{ textAlign: 'center', marginTop: 60, color: '#94a3b8' }}>Session not found</Text>;

  const sortedParticipants = useMemo(
    () => [...(session.participants || [])].sort((a, b) => a.displayOrder - b.displayOrder),
    [session.participants]
  );

  return (
    <Pressable style={styles.container} onPress={Keyboard.dismiss}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetch} />}
      decelerationRate="fast"
    >
      {/* Header */}
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

      {/* Participant cards */}
      <View style={styles.grid}>
        {sortedParticipants.map(p => (
          <ParticipantCard
            key={p.id}
            participant={p}
            items={session.items || []}
            allParticipants={sortedParticipants}
            sessionId={sessionId}
            onUpdate={fetch}
            onEditingChange={handleEditingChange}
          />
        ))}
      </View>

      {/* Share card */}
      {session.shortCode && (
        <View style={styles.shareCard}>
          <Text style={styles.shareCardTitle}>Share with Friends</Text>
          <View style={styles.shareCardRow}>
            <Text style={styles.shareCardUrl} numberOfLines={1}>{shortUrl}</Text>
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

      {/* Settlement section */}
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
          <View>
            <View style={styles.totalBar}>
              <Text style={styles.totalLabel}>Total Expenses</Text>
              <Text style={styles.totalAmount}>${Number(settlement.totalExpenses).toFixed(2)}</Text>
            </View>
            {settlement.debts && settlement.debts.length > 0 ? (
              settlement.debts.map((d, i) => (
                <View key={i} style={styles.debtRow}>
                  <View style={styles.debtPerson}>
                    <View style={styles.debtAvatar}><Text style={styles.debtAvatarText}>{d.fromParticipantName[0]}</Text></View>
                    <Text style={styles.debtName}>{d.fromParticipantName}</Text>
                  </View>
                  <Text style={styles.debtAmountText}>pays ${Number(d.amount).toFixed(2)} to</Text>
                  <View style={styles.debtPerson}>
                    <View style={[styles.debtAvatar, { backgroundColor: '#059669' }]}><Text style={styles.debtAvatarText}>{d.toParticipantName[0]}</Text></View>
                    <Text style={styles.debtName}>{d.toParticipantName}</Text>
                  </View>
                </View>
              ))
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
    </ScrollView>
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingHorizontal: 16, paddingVertical: 14,
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
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  shareCardTitle: { fontSize: 15, fontWeight: '700', color: '#334155', marginBottom: 10 },
  shareCardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shareCardUrl: {
    fontSize: 11, fontFamily: 'monospace', color: '#0ea5e9', fontWeight: '600',
    backgroundColor: '#e0f2fe', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    flex: 1, marginRight: 10, overflow: 'hidden',
  },
  shareCardActions: { flexDirection: 'row', gap: 8, flexShrink: 0 },
  shareIconBtn: {
    backgroundColor: '#0ea5e9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  shareIconText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  grid: { padding: 12 },
  settleSection: { paddingHorizontal: 16, paddingTop: 8 },

  totalBar: {
    backgroundColor: '#059669', borderRadius: 12, padding: 14,
    alignItems: 'center', marginBottom: 12,
  },
  totalLabel: { color: '#a7f3d0', fontSize: 13, fontWeight: '600' },
  totalAmount: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: 2 },
  debtRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  debtPerson: { alignItems: 'center', flex: 1 },
  debtAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#0ea5e9',
    justifyContent: 'center', alignItems: 'center', marginBottom: 2,
  },
  debtAvatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  debtName: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  debtAmountText: { fontSize: 13, fontWeight: '600', color: '#0ea5e9', marginHorizontal: 4 },
  settleActions: {
    flexDirection: 'row', gap: 10, marginTop: 12,
  },
  shareBtn: {
    flex: 1, borderWidth: 1, borderColor: '#0ea5e9', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  shareBtnText: { color: '#0ea5e9', fontSize: 14, fontWeight: '600' },
  recalcBtn: {
    alignSelf: 'center', paddingHorizontal: 32,
    borderWidth: 1, borderColor: '#0ea5e9', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  recalcText: { color: '#0ea5e9', fontSize: 14, fontWeight: '600' },
  settleEmpty: { textAlign: 'center', color: '#94a3b8', fontSize: 14, marginVertical: 20 },
  settlePrompt: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20,
  },
  settlePromptTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  settlePromptSub: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  calcBtn: {
    flex: 1, backgroundColor: '#0ea5e9', paddingVertical: 12,
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
