import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { auth, db } from '../../constants/firebase';
import {
  formatDistanceDisplay,
  formatPaceDisplay,
} from '../../utils/profileFormat';

type MatchItem = {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserPhoto: string;
  otherUserCity: string;
  otherUserPace: string;
  otherUserDistance: string;
  otherUserRunType: string;
  otherUserSex: string;
  unreadCount: number;
};

export default function MatchesScreen() {
  const currentUser = auth.currentUser;

  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    const unsubscribe = db.collection('matches').onSnapshot(
      async (snapshot) => {
        try {
          const results: MatchItem[] = [];

          for (const doc of snapshot.docs) {
            const data = doc.data() as any;

            if (!data?.users || !Array.isArray(data.users)) continue;
            if (!data.users.includes(currentUser.uid)) continue;

            const otherUserId = data.users.find(
              (uid: string) => uid !== currentUser.uid
            );

            if (!otherUserId) continue;

            const otherUserDoc = await db.collection('users').doc(otherUserId).get();
            const otherUserData = otherUserDoc.data() as any;
            const unreadCounts = data?.unreadCounts || {};
            const unreadCount = Number(unreadCounts[currentUser.uid] || 0);

            results.push({
              id: doc.id,
              otherUserId,
              otherUserName: otherUserData?.name || 'Runner',
              otherUserPhoto: otherUserData?.photoURL || '',
              otherUserCity: otherUserData?.city || 'Prague',
              otherUserPace: otherUserData?.pace || '',
              otherUserDistance: otherUserData?.distance || '',
              otherUserRunType: otherUserData?.runType || 'Road',
              otherUserSex: otherUserData?.sex || 'Male',
              unreadCount,
            });
          }

          setMatches(results);
          setLoading(false);
        } catch (error: any) {
          setLoading(false);
          Alert.alert('Error', error?.message || 'Failed to load matches');
        }
      },
      (error: any) => {
        setLoading(false);
        Alert.alert('Error', error?.message || 'Failed to load matches');
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const renderItem = ({ item }: { item: MatchItem }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          {item.otherUserPhoto ? (
            <Image source={{ uri: item.otherUserPhoto }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {item.otherUserName?.charAt(0)?.toUpperCase() || 'R'}
              </Text>
            </View>
          )}

          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{item.otherUserName}</Text>

              {item.unreadCount > 0 && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>
                    {item.unreadCount > 9 ? '9+' : 'NEW'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.cityRow}>
              <Ionicons name="location-sharp" size={14} color="#1c1b2b" />
              <Text style={styles.city}>{item.otherUserCity}</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="swap-horizontal" size={14} color="#1c1b2b" />
                <Text style={styles.statText}>
                  {formatDistanceDisplay(item.otherUserDistance)}
                </Text>
              </View>

              <View style={styles.statItem}>
                <Ionicons name="speedometer-outline" size={14} color="#1c1b2b" />
                <Text style={styles.statText}>
                  {formatPaceDisplay(item.otherUserPace)}
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="walk-outline" size={14} color="#1c1b2b" />
                <Text style={styles.statText}>{item.otherUserRunType}</Text>
              </View>

              <View style={styles.statItem}>
                <Ionicons name="person-outline" size={14} color="#1c1b2b" />
                <Text style={styles.statText}>{item.otherUserSex}</Text>
              </View>
            </View>

            <Text style={styles.matchedText}>You matched on RunHub</Text>
          </View>
        </View>

        <Pressable
          style={styles.messageButton}
          onPress={() =>
            router.push({
              pathname: '/chat-details',
              params: {
                matchId: item.id,
                uid: item.otherUserId,
                name: item.otherUserName,
              },
            })
          }
        >
          <Text style={styles.messageButtonText}>Message</Text>
        </Pressable>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingBrand}>MESSAGES</Text>
        <Text style={styles.loadingText}>Loading matches...</Text>
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingBrand}>MESSAGES</Text>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptyText}>
            Keep exploring runners to get your first match.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <Text style={styles.screenTitle}>MESSAGES</Text>
      </View>

      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b4cb3',
    paddingTop: 40,
  },
  topHeader: {
    paddingHorizontal: 22,
    marginBottom: 12,
  },
  screenTitle: {
    alignSelf: 'flex-start',
    color: '#1c1b2b',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1,
    backgroundColor: '#f7f7f7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    overflow: 'hidden',
  },
  listContent: {
    paddingHorizontal: 22,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: '#f7f7f7',
    borderRadius: 28,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    marginRight: 14,
  },
  avatarPlaceholder: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#d9e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarPlaceholderText: {
    color: '#1a2a55',
    fontSize: 28,
    fontWeight: '900',
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  name: {
    color: '#1c1b2b',
    fontSize: 24,
    fontWeight: '900',
    marginRight: 10,
  },
  newBadge: {
    backgroundColor: '#ff3b3b',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  newBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '900',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  city: {
    color: '#1c1b2b',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 6,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 18,
    marginBottom: 6,
  },
  statText: {
    color: '#1c1b2b',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  matchedText: {
    color: '#4d4a59',
    fontSize: 14,
  },
  messageButton: {
    backgroundColor: '#ff3b3b',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
  },
  messageButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '900',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0b4cb3',
    paddingTop: 40,
    paddingHorizontal: 22,
  },
  loadingBrand: {
    alignSelf: 'flex-start',
    color: '#1c1b2b',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1,
    backgroundColor: '#f7f7f7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  loadingText: {
    color: '#eef4ff',
    fontSize: 16,
  },
  emptyCard: {
    backgroundColor: '#f7f7f7',
    borderRadius: 28,
    padding: 22,
  },
  emptyTitle: {
    color: '#1c1b2b',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 10,
  },
  emptyText: {
    color: '#4d4a59',
    fontSize: 15,
    lineHeight: 22,
  },
});