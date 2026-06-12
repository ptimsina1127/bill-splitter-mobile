import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Keyboard, Pressable,
} from 'react-native';
import api from '../api/client';

export default function HomeScreen({ navigation }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    const val = input.trim();
    if (!val) { Alert.alert('Required', 'Enter a session ID or short code'); return; }
    setLoading(true);
    try {
      const isShort = val.length <= 10;
      const endpoint = isShort ? `/sessions/by-short-code/${val}` : `/sessions/${val}`;
      const { data } = await api.get(endpoint);
      navigation.navigate('Session', { sessionId: data.id, sessionName: data.name });
    } catch (e) {
      try {
        const fallback = val.length <= 10 ? `/sessions/${val}` : `/sessions/by-short-code/${val}`;
        const { data } = await api.get(fallback);
        navigation.navigate('Session', { sessionId: data.id, sessionName: data.name });
      } catch (_) {
        Alert.alert('Not found', 'No session with that ID or code.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable style={styles.container} onPress={Keyboard.dismiss}>
      <View style={styles.logoWrapper}>
        <View style={styles.logoShadow}>
          <View style={styles.logoGradient}>
            <View style={styles.logoInner}>
              <Text style={styles.logoLetter}>B</Text>
            </View>
            <View style={styles.logoAccent} />
          </View>
        </View>
      </View>

      <Text style={styles.title}>Bill Splitter</Text>
      <Text style={styles.subtitle}>Split expenses with friends</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Setup')}
      >
        <Text style={styles.buttonText}>Start New Session</Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.orText}>or</Text>
        <View style={styles.line} />
      </View>

      <Text style={styles.joinLabel}>Session ID or Short Code</Text>
      <TextInput
        style={styles.input}
        placeholder="Paste ID or code e.g. a95FN"
        placeholderTextColor="#94a3b8"
        autoCapitalize="none"
        value={input}
        onChangeText={setInput}
        returnKeyType="join"
        onSubmitEditing={handleJoin}
      />
      <TouchableOpacity
        style={[styles.joinBtn, loading && { opacity: 0.5 }]}
        onPress={handleJoin}
        disabled={loading}
      >
        <Text style={styles.joinBtnText}>{loading ? 'Joining...' : 'Join Session'}</Text>
      </TouchableOpacity>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#f8fafc', padding: 24,
  },
  logoWrapper: {
    marginBottom: 24,
    alignItems: 'center',
  },
  logoShadow: {
    width: 120, height: 120, borderRadius: 32,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  logoGradient: {
    width: 120, height: 120, borderRadius: 32,
    backgroundColor: '#6366f1',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  logoInner: {
    width: 100, height: 100, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  logoLetter: {
    fontSize: 52, fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -4,
    marginTop: -4,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  logoAccent: {
    position: 'absolute', bottom: -20, right: -20,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  title: { fontSize: 36, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#64748b', marginBottom: 48 },
  button: {
    backgroundColor: '#3b82f6', paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 12, width: '100%', alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, width: '100%' },
  line: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  orText: { marginHorizontal: 12, color: '#94a3b8', fontSize: 14 },
  joinLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6, alignSelf: 'flex-start', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 16, fontSize: 16,
    width: '100%', backgroundColor: '#fff', marginBottom: 8,
  },
  joinBtn: {
    backgroundColor: '#3b82f6', paddingVertical: 14,
    borderRadius: 12, width: '100%', alignItems: 'center',
  },
  joinBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
