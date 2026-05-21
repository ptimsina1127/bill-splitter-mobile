import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, Share,
  Keyboard, Pressable,
} from 'react-native';
import api from '../api/client';
import ParticipantCard from '../components/ParticipantCard';

export default function SessionScreen({ route, navigation }) {
  const { sessionId } = route.params;
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settlement, setSettlement] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const { data } = await api.get(`/sessions/${sessionId}`);
      setSession(data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { fetch(); }, [fetch]);

  const calculate = async () => {
    setCalcLoading(true);
    try {
      const { data } = await api.post(`/sessions/${sessionId}/calculate`);
      setSettlement(data);
    } catch (e) {
      Alert.alert('Error', 'Add some expenses first');
    } finally {
      setCalcLoading(false);
    }
  };

  const WEB_URL = `https://khoipaisa.duckdns.org/session/${sessionId}`;

  const shareSession = async () => {
    let msg = `Bill Splitter — ${session.name}\n` +
      `Session: ${sessionId}\n\n`;

    if (session.items && session.items.length > 0) {
      msg += 'Expenses:\n';
      session.items.forEach(item => {
        const payer = sortedParticipants.find(p => p.id === item.paidByParticipantId);
        msg += `  ${payer?.name || '?'} paid $${Number(item.amount).toFixed(2)} for ${item.description}\n`;
      });
      msg += '\n';
    }

    msg += `${session.participants?.length || 0} participants\n` +
      `Open in app: ${WEB_URL}`;
    try { await Share.share({ message: msg }); } catch (_) {}
  };

  const shareSettlement = async () => {
    if (!settlement) return;
    let msg = `Bill Splitter — ${session.name}\n` +
      `Session: ${sessionId}\n\n`;

    if (session.items && session.items.length > 0) {
      msg += 'Expenses:\n';
      session.items.forEach(item => {
        const payer = sortedParticipants.find(p => p.id === item.paidByParticipantId);
        msg += `  ${payer?.name || '?'} paid $${Number(item.amount).toFixed(2)} for ${item.description}\n`;
      });
      msg += '\n';
    }

    msg += `Total: $${Number(settlement.totalExpenses).toFixed(2)}\n`;
    if (settlement.debts && settlement.debts.length > 0) {
      settlement.debts.forEach(d => {
        msg += `${d.fromParticipantName} pays $${Number(d.amount).toFixed(2)} to ${d.toParticipantName}\n`;
      });
    } else {
      msg += 'Everyone is settled up!\n';
    }
    msg += `Open in app: ${WEB_URL}`;
    try { await Share.share({ message: msg }); } catch (_) {}
  };

  const handleLeave = () => navigation.popToTop();

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} />;
  if (!session) return <Text style={{ textAlign: 'center', marginTop: 60, color: '#94a3b8' }}>Session not found</Text>;

  const sortedParticipants = [...(session.participants || [])].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <Pressable style={styles.container} onPress={Keyboard.dismiss}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetch} />}
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
          <Text style={styles.idText}>ID: {sessionId.slice(0, 8)}...</Text>
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
          />
        ))}
      </View>

      {/* Settlement section */}
      <View style={styles.settleSection}>
        {settlement ? (
          <View>
            <View style={styles.settleHeader}>
              <Text style={styles.settleTitle}>Settlements</Text>
              <TouchableOpacity onPress={() => setSettlement(null)}>
                <Text style={styles.settleClose}>Close</Text>
              </TouchableOpacity>
            </View>
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
            <View style={styles.settleActions}>
              <TouchableOpacity style={styles.shareBtn} onPress={shareSettlement}>
                <Text style={styles.shareBtnText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.recalcBtn} onPress={calculate}>
                <Text style={styles.recalcText}>Recalculate</Text>
              </TouchableOpacity>
            </View>
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
  idText: { fontSize: 11, color: '#94a3b8' },
  grid: { padding: 12 },
  settleSection: { paddingHorizontal: 16, paddingTop: 8 },
  settleHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  settleTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  settleClose: { fontSize: 14, color: '#0ea5e9', fontWeight: '600' },
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
    flex: 1, borderWidth: 1, borderColor: '#0ea5e9', borderRadius: 10,
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
});
