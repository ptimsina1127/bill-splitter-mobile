import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Keyboard, Pressable,
} from 'react-native';
import api from '../api/client';

export default function HomeScreen({ navigation }) {
  const [joinId, setJoinId] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    const id = joinId.trim();
    if (!id) { Alert.alert('Required', 'Enter a session ID'); return; }
    setLoading(true);
    try {
      const { data } = await api.get(`/sessions/${id}`);
      navigation.navigate('Session', { sessionId: data.id, sessionName: data.name });
    } catch (e) {
      Alert.alert('Not found', 'No session with that ID.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinShort = async () => {
    const code = shortCode.trim();
    if (!code) { Alert.alert('Required', 'Enter a short code'); return; }
    setLoading(true);
    try {
      const { data } = await api.get(`/sessions/by-short-code/${code}`);
      navigation.navigate('Session', { sessionId: data.id, sessionName: data.name });
    } catch (e) {
      Alert.alert('Not found', 'No session with that code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable style={styles.container} onPress={Keyboard.dismiss}>
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

      <Text style={styles.joinLabel}>Join by Session ID</Text>
      <TextInput
        style={styles.input}
        placeholder="Paste session ID"
        placeholderTextColor="#94a3b8"
        value={joinId}
        onChangeText={setJoinId}
        returnKeyType="done"
        onSubmitEditing={handleJoin}
      />
      <TouchableOpacity
        style={[styles.secondaryButton, loading && { opacity: 0.5 }]}
        onPress={handleJoin}
        disabled={loading}
      >
        <Text style={styles.secondaryButtonText}>Join Session</Text>
      </TouchableOpacity>

      <Text style={[styles.joinLabel, { marginTop: 16 }]}>Join by Short Code</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. a95FN"
        placeholderTextColor="#94a3b8"
        autoCapitalize="none"
        value={shortCode}
        onChangeText={setShortCode}
        returnKeyType="done"
        onSubmitEditing={handleJoinShort}
      />
      <TouchableOpacity
        style={[styles.secondaryButton, loading && { opacity: 0.5 }]}
        onPress={handleJoinShort}
        disabled={loading}
      >
        <Text style={styles.secondaryButtonText}>Join by Code</Text>
      </TouchableOpacity>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#f8fafc', padding: 24,
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
  secondaryButton: {
    borderWidth: 1, borderColor: '#3b82f6', paddingVertical: 14,
    borderRadius: 12, width: '100%', alignItems: 'center', marginBottom: 4,
  },
  secondaryButtonText: { color: '#3b82f6', fontSize: 16, fontWeight: '600' },
});
