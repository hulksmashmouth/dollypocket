import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Conversation } from '../conversations';
import { bevel, blockFont, colors, headerGradient, spacing } from '../theme';

interface Props {
  visible: boolean;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const DRAWER_WIDTH = Math.min(300, Dimensions.get('window').width * 0.82);

export function ConversationDrawer({
  visible,
  conversations,
  activeConversationId,
  onSelect,
  onNewChat,
  onDelete,
  onClose,
}: Props) {
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : -DRAWER_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, translateX]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close menu" />
        <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
          <View style={styles.header}>
            <LinearGradient
              colors={headerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name="heart" size={13} color={colors.textPrimary} />
            <Text style={styles.headerTitle}>The Gabbin' Cabinet</Text>
            <Ionicons name="sparkles" size={14} color={colors.textPrimary} />
          </View>

          <Pressable style={styles.newChatButton} onPress={onNewChat}>
            <Text style={styles.newChatText}>+ New Chat</Text>
          </Pressable>

          <FlatList
            data={conversations}
            keyExtractor={(c) => c.id}
            indicatorStyle="black"
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<Text style={styles.emptyText}>No past chats yet.</Text>}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.row,
                  item.id === activeConversationId && styles.rowActive,
                ]}
              >
                <Pressable style={styles.rowMain} onPress={() => onSelect(item.id)}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.rowDate}>{formatDate(item.updatedAt)}</Text>
                </Pressable>
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => onDelete(item.id)}
                  hitSlop={8}
                  accessibilityLabel={`Delete "${item.title}"`}
                >
                  <Text style={styles.deleteGlyph}>✕</Text>
                </Pressable>
              </View>
            )}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(46,15,61,0.4)',
  },
  drawer: {
    width: DRAWER_WIDTH,
    backgroundColor: colors.bg,
    borderRightWidth: bevel.width,
    borderRightColor: colors.bevelDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderBottomWidth: bevel.width,
    ...bevel.raised,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontFamily: blockFont,
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  newChatButton: {
    margin: spacing.md,
    backgroundColor: colors.accent,
    borderWidth: bevel.width,
    ...bevel.raised,
    paddingVertical: 10,
    alignItems: 'center',
  },
  newChatText: {
    fontFamily: blockFont,
    fontWeight: '700',
    fontSize: 15,
    color: colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  emptyText: {
    fontFamily: blockFont,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: bevel.width,
    ...bevel.sunken,
    marginBottom: spacing.sm,
    paddingLeft: 10,
  },
  rowActive: {
    backgroundColor: colors.accent,
  },
  rowMain: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: 8,
  },
  rowTitle: {
    fontFamily: blockFont,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rowDate: {
    fontFamily: blockFont,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deleteButton: {
    width: 32,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: bevel.width,
    borderLeftColor: colors.bevelDark,
  },
  deleteGlyph: {
    fontFamily: blockFont,
    fontWeight: '900',
    fontSize: 14,
    color: colors.error,
  },
});
