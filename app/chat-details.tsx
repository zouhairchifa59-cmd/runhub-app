import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
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
import { getProfileImage } from '../utils/avatar';

type MessageItem = {
  id: string;
  text: string;
  senderId: string;
  senderName?: string;
  receiverId?: string;
  createdAt?: any;
  seen?: boolean;
};

export default function ChatDetailsScreen() {
  const params = useLocalSearchParams<{
    matchId?: string;
    uid?: string;
    name?: string;
  }>();

  const currentUser = auth.currentUser;
  const insets = useSafeAreaInsets();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [otherUserPhoto, setOtherUserPhoto] = useState('');
  const [otherUserVerified, setOtherUserVerified] = useState(false);

  const matchId = params.matchId ? String(params.matchId) : '';
  const otherUid = params.uid ? String(params.uid) : '';
  const otherName = params.name ? String(params.name) : 'Runner';

  const formatMessageTime = (value: any) => {
    if (!value) return '';

    try {
      const date =
        typeof value?.toDate === 'function'
          ? value.toDate()
          : value?.seconds
          ? new Date(value.seconds * 1000)
          : value instanceof Date
          ? value
          : new Date(value);

      if (!date || Number.isNaN(date.getTime())) return '';

      return date.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const loadOtherUser = useCallback(async () => {
    try {
      if (!otherUid) return;

      const userSnap = await db.collection('users').doc(otherUid).get();
      const userData = (userSnap.data() as any) || {};

      const photo = getProfileImage(
        userData?.photoURL ||
          userData?.avatar ||
          userData?.profileImage ||
          userData?.image ||
          '',
        userData?.sex || userData?.gender || ''
      );

      setOtherUserPhoto(photo);
      setOtherUserVerified(Boolean(userData?.verified));
    } catch {
      setOtherUserPhoto(getProfileImage('', ''));
      setOtherUserVerified(false);
    }
  }, [otherUid]);

  const markMatchOpenedAndRead = useCallback(async () => {
    try {
      if (!matchId || !currentUser?.uid) return;

      const matchRef = db.collection('matches').doc(matchId);
      const matchSnap = await matchRef.get();
      const matchData = (matchSnap.data() as any) || {};

      const unreadCounts = matchData.unreadCounts || {};
      const openedBy = matchData.openedBy || {};

      await matchRef.set(
        {
          unreadCounts: {
            ...unreadCounts,
            [currentUser.uid]: 0,
          },
          openedBy: {
            ...openedBy,
            [currentUser.uid]: true,
          },
        },
        { merge: true }
      );

      const unseenSnapshot = await matchRef
        .collection('messages')
        .where('receiverId', '==', currentUser.uid)
        .where('seen', '==', false)
        .get();

      if (!unseenSnapshot.empty) {
        const batch = db.batch();

        unseenSnapshot.docs.forEach((doc: any) => {
          batch.update(doc.ref, {
            seen: true,
            seenAt: new Date(),
          });
        });

        await batch.commit();
      }
    } catch (error) {
      console.log('markMatchOpenedAndRead error:', error);
    }
  }, [currentUser?.uid, matchId]);

  useEffect(() => {
    loadOtherUser();
  }, [loadOtherUser]);

  useEffect(() => {
    if (!matchId || !currentUser?.uid) {
      setLoading(false);
      return;
    }

    markMatchOpenedAndRead();

    const unsubscribeMessages = db
      .collection('matches')
      .doc(matchId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        async (snapshot: any) => {
          const loadedMessages: MessageItem[] = snapshot.docs.map((doc: any) => {
            const data = doc.data() as any;

            return {
              id: doc.id,
              text: data?.text || '',
              senderId: data?.senderId || '',
              senderName: data?.senderName || '',
              receiverId: data?.receiverId || '',
              createdAt: data?.createdAt || null,
              seen: data?.seen || false,
            };
          });

          setMessages(loadedMessages);
          setLoading(false);

          await markMatchOpenedAndRead();
        },
        (error: any) => {
          setLoading(false);
          Alert.alert('Error', error?.message || 'Failed to load messages');
        }
      );

    const unsubscribeTyping = db
      .collection('matches')
      .doc(matchId)
      .onSnapshot((doc: any) => {
        const data = (doc.data() as any) || {};
        const typingBy = data?.typingBy || {};
        setOtherUserTyping(Boolean(typingBy[otherUid]));
      });

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (matchId && currentUser?.uid) {
        db.collection('matches').doc(matchId).set(
          {
            typingBy: {
              [currentUser.uid]: false,
            },
          },
          { merge: true }
        );
      }
    };
  }, [currentUser?.uid, markMatchOpenedAndRead, matchId, otherUid]);

  const setTyping = async (isTyping: boolean) => {
    try {
      if (!matchId || !currentUser?.uid) return;

      await db.collection('matches').doc(matchId).set(
        {
          typingBy: {
            [currentUser.uid]: isTyping,
          },
        },
        { merge: true }
      );
    } catch (error) {
      console.log('typing update error:', error);
    }
  };

  const handleChangeText = (text: string) => {
    setMessage(text);

    if (!currentUser?.uid || !matchId) return;

    setTyping(text.trim().length > 0);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 1200);
  };

  const handleSend = async () => {
    try {
      if (!currentUser?.uid) {
        Alert.alert('Error', 'No logged in user');
        return;
      }

      if (!matchId) {
        Alert.alert('Error', 'No matchId found');
        return;
      }

      if (!otherUid) {
        Alert.alert('Error', 'No receiver found');
        return;
      }

      const textToSend = message.trim();
      if (!textToSend) return;

      setSending(true);

      const myDoc = await db.collection('users').doc(currentUser.uid).get();
      const myData = myDoc.data() as any;
      const myName = myData?.name || 'Runner';

      const matchRef = db.collection('matches').doc(matchId);
      const matchSnap = await matchRef.get();
      const matchData = (matchSnap.data() as any) || {};
      const unreadCounts = matchData.unreadCounts || {};
      const openedBy = matchData.openedBy || {};

      const firstMessageCheck = await matchRef
        .collection('messages')
        .limit(1)
        .get();

      const isFirstMessage = firstMessageCheck.empty;
      const receiverUnreadCount = Number(unreadCounts[otherUid] || 0) + 1;
      const now = new Date();

      await matchRef.collection('messages').add({
        text: textToSend,
        senderId: currentUser.uid,
        senderName: myName,
        receiverId: otherUid,
        createdAt: now,
        seen: false,
      });

      await matchRef.set(
        {
          hasMessages: true,
          firstMessageAt: isFirstMessage
            ? now
            : matchData.firstMessageAt || now,
          lastMessage: textToSend,
          lastMessageAt: now,
          lastSenderId: currentUser.uid,
          lastReceiverId: otherUid,
          lastSenderName: myName,
          typingBy: {
            [currentUser.uid]: false,
          },
          unreadCounts: {
            ...unreadCounts,
            [otherUid]: receiverUnreadCount,
            [currentUser.uid]: 0,
          },
          openedBy: {
            ...openedBy,
            [currentUser.uid]: true,
            [otherUid]: false,
          },
        },
        { merge: true }
      );

      setMessage('');

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const openProfile = () => {
    if (!otherUid) return;

    router.push({
      pathname: '/user-profile',
      params: { uid: otherUid },
    });
  };

  const renderSeenStatus = (item: MessageItem) => {
    if (item.senderId !== currentUser?.uid) return null;

    return (
      <Text style={styles.statusText}>
        {item.seen ? 'Seen' : 'Sent'}
      </Text>
    );
  };

  const renderItem = ({ item }: { item: MessageItem }) => {
    const isMine = item.senderId === currentUser?.uid;

    if (isMine) {
      return (
        <View style={styles.messageBlock}>
          <View style={styles.myRow}>
            <View style={[styles.messageBubble, styles.myMessage]}>
              <Text style={[styles.messageText, styles.myMessageText]}>
                {item.text}
              </Text>
            </View>
          </View>

          <View style={styles.metaLineMine}>
            <Text style={styles.timeMeta}>{formatMessageTime(item.createdAt)}</Text>
            {renderSeenStatus(item)}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.messageBlock}>
        <View style={styles.theirRow}>
          <Image source={{ uri: otherUserPhoto }} style={styles.inlineAvatar} />

          <View style={styles.theirContent}>
            <View style={[styles.messageBubble, styles.theirMessage]}>
              <Text style={styles.messageText}>{item.text}</Text>
            </View>

            <View style={styles.metaLine}>
              <Text style={styles.timeMeta}>{formatMessageTime(item.createdAt)}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerIcon}>
            <Ionicons name="chevron-back" size={30} color="#6b7280" />
          </Pressable>

          <Pressable style={styles.headerCenter} onPress={openProfile}>
            <Image source={{ uri: otherUserPhoto }} style={styles.headerAvatar} />

            <View style={styles.headerTextWrap}>
              <View style={styles.headerNameRow}>
                <Text style={styles.headerName}>{otherName}</Text>
                {otherUserVerified && (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color="#0b7adf"
                    style={{ marginLeft: 6 }}
                  />
                )}
              </View>

              <Text style={styles.headerSub}>
                {otherUserTyping ? 'typing...' : i18n.t('tapToViewProfile')}
              </Text>
            </View>
          </Pressable>

          <Pressable style={styles.headerIcon}>
            <Ionicons name="ellipsis-horizontal" size={26} color="#6b7280" />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>{i18n.t('loadingChats')}</Text>
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            inverted
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}

        <View style={[styles.inputWrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={i18n.t('writeMessage')}
              placeholderTextColor="#8b95a7"
              value={message}
              onChangeText={handleChangeText}
              multiline
            />

            <Pressable
              style={[styles.sendButton, sending && { opacity: 0.6 }]}
              onPress={handleSend}
              disabled={sending}
            >
              <Ionicons name="send" size={18} color="white" />
              <Text style={styles.sendText}>Send</Text>
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
    backgroundColor: '#f5f6f8',
  },

  container: {
    flex: 1,
  },

  header: {
    height: 84,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#d7dbe2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  headerIcon: {
    width: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },

  headerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#dde3ec',
  },

  headerTextWrap: {
    flex: 1,
    marginLeft: 12,
  },

  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#151b26',
  },

  headerSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: '#7b8494',
  },

  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '600',
  },

  list: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 20,
  },

  messageBlock: {
    marginBottom: 14,
  },

  myRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },

  theirRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },

  theirContent: {
    maxWidth: '80%',
    marginLeft: 10,
  },

  inlineAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#dde3ec',
    marginBottom: 2,
  },

  messageBubble: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 24,
  },

  myMessage: {
    maxWidth: '80%',
    backgroundColor: '#0b7adf',
    borderBottomRightRadius: 8,
  },

  theirMessage: {
    backgroundColor: '#e6e8ed',
    borderBottomLeftRadius: 8,
  },

  messageText: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
    color: '#1d2433',
  },

  myMessageText: {
    color: '#ffffff',
  },

  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingLeft: 2,
  },

  metaLineMine: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
    marginRight: 2,
  },

  timeMeta: {
    fontSize: 12,
    color: '#7b8494',
    fontWeight: '600',
    marginRight: 8,
  },

  statusText: {
    fontSize: 12,
    color: '#7b8494',
    fontWeight: '700',
  },

  inputWrap: {
    backgroundColor: '#f5f6f8',
    paddingHorizontal: 12,
    paddingTop: 8,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#9aa3b2',
    borderRadius: 28,
    paddingLeft: 16,
    paddingRight: 8,
    minHeight: 58,
  },

  input: {
    flex: 1,
    fontSize: 17,
    color: '#1d2433',
    paddingVertical: 10,
    paddingRight: 12,
  },

  sendButton: {
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ff3b3b',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  sendText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
});
