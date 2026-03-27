import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../constants/firebase';
import { getProfileImage } from '../../utils/avatar';

type ChatItem = {
  id: string;
  otherUid: string;
  otherName: string;
  otherPhoto: string;
  city?: string;
  distanceText?: string;
  paceText?: string;
  hasMessages: boolean;
  lastMessage?: string;
  lastMessageAt?: any;
  firstMessageAt?: any;
  matchCreatedAt?: any;
  unreadCount: number;
};

export default function ChatScreen() {
  const currentUser = auth.currentUser;

  const [matches, setMatches] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const getOtherUserData = async (otherUid: string) => {
    try {
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

      const rawDistance =
        userData?.distanceText ??
        userData?.distance ??
        userData?.runningDistance ??
        userData?.preferredDistance ??
        userData?.range ??
        userData?.distanceKm ??
        userData?.km;

      let distanceText = '—';

      if (typeof rawDistance === 'number') {
        distanceText = `${rawDistance} KM`;
      } else if (typeof rawDistance === 'string' && rawDistance.trim().length > 0) {
        distanceText = rawDistance;
      }

      return {
        name: userData?.name || 'Runner',
        photo,
        city: userData?.city || userData?.location || userData?.town || 'Prague',
        distanceText,
        paceText:
          userData?.paceText ||
          userData?.pace ||
          userData?.runningPace ||
          '—',
      };
    } catch (error) {
      return {
        name: 'Runner',
        photo: getProfileImage('', ''),
        city: 'Prague',
        distanceText: '—',
        paceText: '—',
      };
    }
  };

  const getTimeValue = (value: any) => {
    if (!value) return 0;

    if (typeof value?.toDate === 'function') {
      return value.toDate().getTime();
    }

    if (typeof value?.seconds === 'number') {
      return value.seconds * 1000;
    }

    if (value instanceof Date) {
      return value.getTime();
    }

    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const formatTime = (value: any) => {
    const time = getTimeValue(value);
    if (!time) return '';

    try {
      return new Date(time).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const sortNewMatches = (items: ChatItem[]) => {
    return [...items].sort((a, b) => {
      const aTime =
        getTimeValue(a.matchCreatedAt) ||
        getTimeValue(a.firstMessageAt) ||
        getTimeValue(a.lastMessageAt);

      const bTime =
        getTimeValue(b.matchCreatedAt) ||
        getTimeValue(b.firstMessageAt) ||
        getTimeValue(b.lastMessageAt);

      return bTime - aTime;
    });
  };

  const sortMessageMatches = (items: ChatItem[]) => {
    return [...items].sort((a, b) => {
      const aTime =
        getTimeValue(a.lastMessageAt) ||
        getTimeValue(a.firstMessageAt) ||
        getTimeValue(a.matchCreatedAt);

      const bTime =
        getTimeValue(b.lastMessageAt) ||
        getTimeValue(b.firstMessageAt) ||
        getTimeValue(b.matchCreatedAt);

      return bTime - aTime;
    });
  };

  const loadMatches = useCallback(async () => {
    try {
      if (!currentUser?.uid) {
        setMatches([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const snapshot = await db
        .collection('matches')
        .where('users', 'array-contains', currentUser.uid)
        .get();

      const loaded = await Promise.all(
        snapshot.docs.map(async (doc: any) => {
          const data = (doc.data() as any) || {};
          const users = Array.isArray(data?.users) ? data.users : [];
          const otherUid =
            users.find((uid: string) => uid !== currentUser.uid) || '';

          const otherUser = await getOtherUserData(otherUid);

          return {
            id: doc.id,
            otherUid,
            otherName: otherUser.name,
            otherPhoto: otherUser.photo,
            city: otherUser.city,
            distanceText: otherUser.distanceText,
            paceText: otherUser.paceText,
            hasMessages: Boolean(data?.hasMessages || data?.lastMessage),
            lastMessage: data?.lastMessage || '',
            lastMessageAt: data?.lastMessageAt || null,
            firstMessageAt: data?.firstMessageAt || null,
            matchCreatedAt:
              data?.createdAt || data?.matchedAt || data?.timestamp || null,
            unreadCount: Number(data?.unreadCounts?.[currentUser.uid] || 0),
          } as ChatItem;
        })
      );

      setMatches(loaded);
    } catch (error) {
      console.log('loadMatches error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.uid]);

  useFocusEffect(
    useCallback(() => {
      loadMatches();

      if (!currentUser?.uid) return;

      const unsubscribe = db
        .collection('matches')
        .where('users', 'array-contains', currentUser.uid)
        .onSnapshot(async (snapshot: any) => {
          try {
            const loaded = await Promise.all(
              snapshot.docs.map(async (doc: any) => {
                const data = (doc.data() as any) || {};
                const users = Array.isArray(data?.users) ? data.users : [];
                const otherUid =
                  users.find((uid: string) => uid !== currentUser.uid) || '';

                const otherUser = await getOtherUserData(otherUid);

                return {
                  id: doc.id,
                  otherUid,
                  otherName: otherUser.name,
                  otherPhoto: otherUser.photo,
                  city: otherUser.city,
                  distanceText: otherUser.distanceText,
                  paceText: otherUser.paceText,
                  hasMessages: Boolean(data?.hasMessages || data?.lastMessage),
                  lastMessage: data?.lastMessage || '',
                  lastMessageAt: data?.lastMessageAt || null,
                  firstMessageAt: data?.firstMessageAt || null,
                  matchCreatedAt:
                    data?.createdAt || data?.matchedAt || data?.timestamp || null,
                  unreadCount: Number(data?.unreadCounts?.[currentUser.uid] || 0),
                } as ChatItem;
              })
            );

            setMatches(loaded);
            setLoading(false);
          } catch (error) {
            console.log('matches snapshot error:', error);
            setLoading(false);
          }
        });

      return () => unsubscribe();
    }, [currentUser?.uid, loadMatches])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadMatches();
  };

  const filteredMatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return matches;

    return matches.filter((item) => {
      return (
        item.otherName.toLowerCase().includes(q) ||
        (item.city || '').toLowerCase().includes(q)
      );
    });
  }, [matches, search]);

  const newMatches = useMemo(() => {
    return sortNewMatches(filteredMatches.filter((item) => !item.hasMessages));
  }, [filteredMatches]);

  const messageMatches = useMemo(() => {
    return sortMessageMatches(filteredMatches.filter((item) => item.hasMessages));
  }, [filteredMatches]);

  const openChat = (item: ChatItem) => {
    setMatches((prev) =>
      prev.map((match) =>
        match.id === item.id ? { ...match, unreadCount: 0 } : match
      )
    );

    router.push({
      pathname: '/chat-details',
      params: {
        matchId: item.id,
        uid: item.otherUid,
        name: item.otherName,
      },
    });
  };

  const renderNewMatchItem = ({ item }: { item: ChatItem }) => {
    return (
      <Pressable style={styles.newMatchItem} onPress={() => openChat(item)}>
        <Image source={{ uri: item.otherPhoto }} style={styles.newMatchImage} />
        <Text style={styles.newMatchName} numberOfLines={1}>
          {item.otherName}
        </Text>
      </Pressable>
    );
  };

  const renderMessageItem = ({ item }: { item: ChatItem }) => {
    return (
      <Pressable style={styles.messageRow} onPress={() => openChat(item)}>
        <View style={styles.avatarWrap}>
          <Image source={{ uri: item.otherPhoto }} style={styles.avatar} />
          {item.unreadCount > 0 && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.messageContent}>
          <View style={styles.messageTop}>
            <View style={styles.nameBadgeRow}>
              <Text style={styles.messageName} numberOfLines={1}>
                {item.otherName}
              </Text>

              {item.unreadCount > 0 && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>
                    {item.unreadCount > 9 ? '9+' : 'NEW'}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.timeText}>{formatTime(item.lastMessageAt)}</Text>
          </View>

          <Text style={styles.cityText} numberOfLines={1}>
            <Ionicons name="location-sharp" size={14} color="#6b7280" />{' '}
            {item.city || 'Prague'}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>⇄ {item.distanceText || '—'}</Text>
            <Text style={styles.metaText}>🏁 {item.paceText || '—'}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#1f2937" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={messageMatches}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <Text style={styles.title}>Chat</Text>

              <View style={styles.headerIcons}>
                <Pressable style={styles.iconButton}>
                  <Ionicons name="shield-outline" size={24} color="#6b7280" />
                </Pressable>

                <Pressable style={styles.iconButton}>
                  <Ionicons
                    name="notifications-outline"
                    size={24}
                    color="#6b7280"
                  />
                  <View style={styles.notificationDot} />
                </Pressable>
              </View>
            </View>

            <View style={styles.searchBar}>
              <Ionicons name="search" size={24} color="#9ca3af" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={`Search ${matches.length} Matches`}
                placeholderTextColor="#6b7280"
                style={styles.searchInput}
              />
            </View>

            <View style={styles.separator} />

            <Text style={styles.sectionTitle}>New Matches</Text>

            {newMatches.length > 0 ? (
              <FlatList
                data={newMatches}
                keyExtractor={(item) => item.id}
                renderItem={renderNewMatchItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.newMatchesList}
              />
            ) : (
              <Text style={styles.emptyText}>No new matches</Text>
            )}

            <Text style={styles.sectionTitleMessages}>Messages</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.messageSeparator} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No messages found</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  content: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 40,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 22,
  },

  title: {
    fontSize: 44,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -1,
  },

  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  notificationDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff375f',
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingBottom: 10,
  },

  searchInput: {
    flex: 1,
    fontSize: 22,
    color: '#4b5563',
    marginLeft: 14,
    paddingVertical: 4,
  },

  separator: {
    height: 1,
    backgroundColor: '#d1d5db',
    marginTop: 8,
    marginBottom: 26,
    marginHorizontal: 6,
  },

  sectionTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 18,
  },

  sectionTitleMessages: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
    marginTop: 18,
    marginBottom: 10,
  },

  newMatchesList: {
    paddingBottom: 8,
    paddingRight: 10,
  },

  newMatchItem: {
    width: 106,
    marginRight: 18,
    alignItems: 'center',
  },

  newMatchImage: {
    width: 106,
    height: 106,
    borderRadius: 28,
    marginBottom: 10,
    backgroundColor: '#e5e7eb',
  },

  newMatchName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },

  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },

  avatarWrap: {
    width: 76,
    height: 76,
    marginRight: 18,
    position: 'relative',
  },

  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#e5e7eb',
  },

  onlineDot: {
    position: 'absolute',
    left: 56,
    top: 50,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#7ed957',
    borderWidth: 2,
    borderColor: '#f5f5f5',
  },

  messageContent: {
    flex: 1,
    justifyContent: 'center',
  },

  messageTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },

  messageName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    marginRight: 10,
  },

  newBadge: {
    backgroundColor: '#111111',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },

  newBadgeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },

  timeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
  },

  cityText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  metaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4b5563',
    marginRight: 16,
  },

  messageSeparator: {
    height: 1,
    backgroundColor: '#d1d5db',
    marginLeft: 94,
  },

  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
  },
});