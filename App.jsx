import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import SetupScreen from './src/screens/SetupScreen';
import SessionScreen from './src/screens/SessionScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
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
  );
}
