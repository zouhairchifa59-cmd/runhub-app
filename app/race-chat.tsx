import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { auth, db } from '../constants/firebase';
import i18n from '../translations';

type RaceMessage = {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt?: any;
};

export default function RaceChatScreen() {
  const params = useLocalSearchParams<{
    raceId?: string;
    raceName?: string;
  }>();

  const currentUser = auth.currentUser;
  const insets = useSafeAreaInsets();

  const raceId = params.raceId ? String(params.raceId) : '';
  const raceName = params.raceName ? String(params.raceName) : 'Race Chat';

  const [messages, setMessages] = useState<RaceMessage[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!raceId) {
      setLoading(false);
      return;
    }

    const unsubscribe = db
      .collection('race_chats')
      .doc(raceId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snapshot) => {
          const loaded: RaceMessage[] = snapshot.docs.map((doc) => {
            const data = doc.data() as any;

            return {
              id: doc.id,
              text: data?.text || '',
              senderId: data?.senderId || '',
              senderName: data?.senderName || 'Runner',
              createdAt: data?.createdAt || null,
            };
          });

          setMessages(loaded);
          setLoading(false);
        },
        (error: any) => {
          setLoading(false);
          Alert.alert('Error', error?.message || 'Failed to load race chat');
        }
      );

    return () => unsubscribe();
  }, [raceId]);

  const handleSend = async () => {
    try {
      if (!currentUser?.uid) {
        Alert.alert('Error', 'No logged in user');
        return;
      }

      if (!raceId) {
        Alert.alert('Error', 'Race not found');
        return;
      }

      const textToSend = message.trim();
      if (!textToSend) return;

      setSending(true);

      const userDoc = await db.collection('users').doc(currentUser.uid).get();
      const userData = userDoc.data() as any;
      const senderName = userData?.name || 'Runner';

      await db
        .collection('race_chats')
        .doc(raceId)
        .collection('messages')
        .add({
          text: textToSend,
          senderId: currentUser.uid,
          senderName,
          createdAt: new Date(),
        });

      setMessage('');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: RaceMessage }) => {
    const isMine = item.senderId === currentUser?.uid;

    return (
      <View
        style={[
          styles.messageBubble,
          isMine ? styles.myMessage : styles.theirMessage,
        ]}
      >
        {!isMine && <Text style={styles.senderName}>{item.senderName}</Text>}

        <Text style={[styles.messageText, isMine && styles.myMessageText]}>
          {item.text}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.topHeader}>
          <Pressable onPress={() => router.back()} style={styles.backCircle}>
            <Ionicons name="chevron-back" size={22} color="#1c1b2b" />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerName} numberOfLines={1}>
              {raceName}
            </Text>
            <Text style={styles.headerSub}>group chat</Text>
          </View>

          <View style={styles.headerRightPlaceholder} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{i18n.t('loadingChats')}</Text>
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            inverted
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>{i18n.t('startChatTitle')}</Text>
                  <Text style={styles.emptyText}>
                    {i18n.t('startRaceChatSubtitle')}
                  </Text>
                </View>
              </View>
            }
          />
        )}

        <View
          style={[
            styles.inputArea,
            {
              paddingBottom: Math.max(insets.bottom, 8),
            },
          ]}
        >
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={i18n.t('writeMessage')}
              placeholderTextColor="#6b7280"
              value={message}
              onChangeText={setMessage}
              multiline
              textAlignVertical="top"
            />

            <Pressable
              style={[styles.sendButton, sending && styles.disabledButton]}
              onPress={handleSend}
              disabled={sending}
            >
              <Ionicons name="send" size={20} color="white" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0b4cb3',
  },
  container: {
    flex: 1,
    backgroundColor: '#0b4cb3',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
  },
  backCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#f7f7f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
    backgroundColor: '#f7f7f7',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  headerName: {
    color: '#1c1b2b',
    fontSize: 20,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  headerSub: {
    color: '#4d4a59',
    fontSize: 13,
    marginTop: 2,
    fontWeight: '700',
  },
  headerRightPlaceholder: {
    width: 48,
    height: 48,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#eef4ff',
    fontSize: 16,
    fontWeight: '700',
  },
  messagesList: {
    paddingHorizontal: 18,
    paddingBottom: 10,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#f7f7f7',
    borderRadius: 24,
    padding: 22,
    width: '100%',
  },
  emptyTitle: {
    color: '#1c1b2b',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  emptyText: {
    color: '#4d4a59',
    fontSize: 15,
    lineHeight: 22,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 22,
    marginBottom: 10,
  },
  myMessage: {
    backgroundColor: '#ff3b3b',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 8,
  },
  theirMessage: {
    backgroundColor: '#f7f7f7',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 8,
  },
  senderName: {
    color: '#4d4a59',
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '800',
  },
  messageText: {
    color: '#1c1b2b',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
  myMessageText: {
    color: 'white',
  },
  inputArea: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f7f7f7',
    borderRadius: 24,
    padding: 8,
  },
  input: {
    flex: 1,
    color: '#1c1b2b',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 48,
    maxHeight: 120,
    fontSize: 15,
    fontWeight: '600',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#ff3b3b',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
});