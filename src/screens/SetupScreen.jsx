import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  Keyboard, Pressable, ScrollView,
} from 'react-native';
import axios from 'axios';

const API = axios.create({
  baseURL: 'https://khoipaisa.duckdns.org/spring-api',
  headers: { 'Content-Type': 'application/json' },
});

export default function SetupScreen({ navigation }) {
  const [name, setName] = useState('');
  const [countInput, setCountInput] = useState('2');
  const [loading, setLoading] = useState(false);

  const count = Math.max(2, parseInt(countInput) || 2);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Enter a session name');
      return;
    }
    setLoading(true);
    try {
      const participantNames = Array.from({ length: count }, (_, i) => `Person ${i + 1}`);
      const { data } = await API.post('/sessions', { name, participantNames });
      navigation.replace('Session', { sessionId: data.id, sessionName: data.name });
    } catch (err) {
      Alert.alert('Error', 'Failed to create session. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable style={styles.container} onPress={Keyboard.dismiss}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        <Text style={styles.heading}>Create a session</Text>
        <Text style={styles.subtitle}>Set up a space for your shared expenses.</Text>

        <Text style={styles.label}>Session Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Tokyo Summer Trip"
          placeholderTextColor="#94a3b8"
          value={name}
          onChangeText={setName}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />

        <Text style={styles.label}>Number of People</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={countInput}
          onChangeText={(v) => {
            if (v === '' || /^\d+$/.test(v)) setCountInput(v);
          }}
          onBlur={() => {
            const num = parseInt(countInput);
            if (isNaN(num) || num < 2) setCountInput('2');
            else if (num > 50) setCountInput('50');
          }}
        />
        <Text style={styles.hint}>You can edit names once the session starts.</Text>

        <TouchableOpacity
          style={[styles.createBtn, loading && styles.disabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          <Text style={styles.createText}>{loading ? 'Creating...' : 'Create Session'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1, padding: 24, justifyContent: 'center',
  },
  heading: {
    fontSize: 28, fontWeight: 'bold', color: '#1e293b', marginBottom: 4,
  },
  subtitle: {
    fontSize: 15, color: '#64748b', marginBottom: 32,
  },
  label: {
    fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6, marginTop: 16,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 16, fontSize: 16,
    backgroundColor: '#fff',
  },
  hint: {
    fontSize: 12, color: '#94a3b8', marginTop: 4, marginBottom: 24,
  },
  createBtn: {
    backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', marginTop: 8,
  },
  disabled: { opacity: 0.5 },
  createText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
