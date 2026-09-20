import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DollyDoll } from './src/components/DollyDoll';
import { ChatScreen } from './src/screens/ChatScreen';
import { colors } from './src/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={styles.background}>
        <View style={styles.dollAnchor} pointerEvents="none">
          <DollyDoll size={90} />
        </View>
        <ChatScreen />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  dollAnchor: {
    // Lifted clear of the opaque chat-input bar at the very bottom of the
    // screen (otherwise a full-width opaque panel would hide this entirely)
    // so it actually peeks into the message list's background.
    position: 'absolute',
    bottom: 100,
    right: 8,
    opacity: 0.85,
  },
});
