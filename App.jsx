import { useEffect, useRef } from 'react';
import { Linking, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import api from './src/api/client';
import HomeScreen from './src/screens/HomeScreen';
import SetupScreen from './src/screens/SetupScreen';
import SessionScreen from './src/screens/SessionScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const navigationRef = useRef(null);

  useEffect(() => {
    const resolveShortCode = async (url) => {
      const match = url.match(/\/s\/([^/]+)/);
      if (!match) return;
      const shortCode = match[1];
      try {
        const { data } = await api.get(`/sessions/by-short-code/${shortCode}`);
        if (navigationRef.current) {
          navigationRef.current.navigate('Session', {
            sessionId: data.id,
            sessionName: data.name,
          });
        }
      } catch {
        Alert.alert('Session Not Found', 'Could not find a session with that link.');
      }
    };

    const sub = Linking.addEventListener('url', (event) => {
      resolveShortCode(event.url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) resolveShortCode(url);
    });

    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#f8fafc' },
          headerTintColor: '#1e293b',
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Setup"
          component={SetupScreen}
          options={{ title: 'New Session' }}
        />
        <Stack.Screen
          name="Session"
          component={SessionScreen}
          options={({ route }) => ({ title: route.params.sessionName })}
        />
      </Stack.Navigator>
    </NavigationContainer>
    </GestureHandlerRootView>
  );
}
