import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../constants/firebase';
import {
  cancelScheduledReminders,
  scheduleRaceReminder,
} from '../lib/notifications';
import i18n from '../translations';
import { getProfileImage } from '../utils/avatar';

type RaceItem = {
  id: string;
  name: string;
  date: string;
  time?: string;
  place: string;
  distance?: string;
  price: string;
  description: string;
  creatorName?: string;
  maxParticipants?: number;
  imageURL?: string;
};

type ParticipantItem = {
  id: string;
  name: string;
  city: string;
  sex?: string;
  photoURL?: string;
};

const DEFAULT_RUN_IMAGE =
  'https://res.cloudinary.com/dkj2qsk4z/image/upload/v1774603075/ChatGPT_Image_Mar_27_2026_10_09_21_AM_v3mmga.png';

function formatEventDate(dateString?: string, time?: string) {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return time ? `${dateString} • ${time}` : dateString;
  }

  const formatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });

  return time ? `${formatted} • ${time}` : formatted;
}

function InfoChip({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  if (!text) return null;

  return (
    <View style={styles.infoChip}>
      <Ionicons name={icon} size={17} color="#2D3B63" />
      <Text style={styles.infoChipText}>{text}</Text>
    </View>
  );
}

export default function RaceDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const user = auth.currentUser;

  const [race, setRace] = useState<RaceItem | null>(null);
  const [loadingRace, setLoadingRace] = useState(true);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);

  const raceId = String(id || '');

  const loadRace = useCallback(async () => {
    try {
      if (!raceId) {
        setLoadingRace(false);
        return;
      }

      setLoadingRace(true);

      const docSnap = await db.collection('races').doc(raceId).get();

      if (!docSnap.exists) {
        setRace(null);
        return;
      }

      const data = docSnap.data() as any;

      setRace({
        id: docSnap.id,
        name: data?.name || '',
        date: data?.date || '',
        time: data?.time || '',
        place: data?.place || '',
        distance: data?.distance || '',
        price: data?.price || '',
        description: data?.description || '',
        creatorName: data?.creatorName || '',
        maxParticipants: Number(data?.maxParticipants || 20),
        imageURL: data?.imageURL || data?.photoURL || data?.coverImage || '',
      });
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load race details');
    } finally {
      setLoadingRace(false);
    }
  }, [raceId]);

  const loadParticipants = useCallback(async () => {
    try {
      if (!raceId) {
        setLoadingParticipants(false);
        return;
      }

      setLoadingParticipants(true);

      const snapshot = await db
        .collection('race_participants')
        .where('raceId', '==', raceId)
        .get();

      const list: ParticipantItem[] = [];

      for (const doc of snapshot.docs) {
        const data = doc.data() as any;
        const userId = data?.userId;
        if (!userId) continue;

        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data() as any;

        list.push({
          id: userId,
          name: userData?.name || 'Runner',
          city: userData?.city || 'Unknown city',
          sex: userData?.sex || '',
          photoURL: userData?.photoURL || '',
        });
      }

      setParticipants(list);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load participants');
    } finally {
      setLoadingParticipants(false);
    }
  }, [raceId]);

  const checkJoined = useCallback(async () => {
    try {
      if (!user?.uid || !raceId) {
        setJoined(false);
        return;
      }

      const docId = `${raceId}_${user.uid}`;
      const docSnap = await db.collection('race_participants').doc(docId).get();
      setJoined(docSnap.exists);
    } catch (error) {
      console.log('checkJoined error:', error);
      setJoined(false);
    }
  }, [raceId, user?.uid]);

  useEffect(() => {
    loadRace();
    loadParticipants();
  }, [loadParticipants, loadRace]);

  useEffect(() => {
    checkJoined();
  }, [checkJoined]);

  const handleJoin = async () => {
    try {
      if (!user?.uid) {
        Alert.alert('Error', 'Login first');
        return;
      }

      if (!raceId) {
        Alert.alert('Error', 'Race not found');
        return;
      }

      setJoining(true);

      const docId = `${raceId}_${user.uid}`;

      await db.collection('race_participants').doc(docId).set({
        raceId,
        userId: user.uid,
        joinedAt: new Date(),
      });

      setJoined(true);
      await loadParticipants();

      if (race?.date) {
        try {
          const reminderIds = await Promise.all([
            scheduleRaceReminder({
              raceId,
              raceName: race?.name || 'Your run',
              raceDate: race.date,
              raceTime: race.time,
              minutesBefore: 60 * 24,
            }),
            scheduleRaceReminder({
              raceId,
              raceName: race?.name || 'Your run',
              raceDate: race.date,
              raceTime: race.time,
              minutesBefore: 60,
            }),
          ]);

          const validReminderIds = reminderIds.filter(
            (id): id is string => typeof id === 'string'
          );

          if (validReminderIds.length > 0) {
            await db.collection('race_participants').doc(docId).set(
              {
                reminderNotificationIds: validReminderIds,
              },
              { merge: true }
            );
          }
        } catch (error) {
          console.log('schedule reminder error:', error);
        }
      }

      Alert.alert('Joined!', 'You joined this run');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to join run');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    try {
      if (!user?.uid || !raceId) return;

      setLeaving(true);
      const docId = `${raceId}_${user.uid}`;
      const participantRef = db.collection('race_participants').doc(docId);
      const participantSnap = await participantRef.get();
      const data = (participantSnap.data() as any) || {};
      const reminderIds = Array.isArray(data?.reminderNotificationIds)
        ? data.reminderNotificationIds
        : [];

      await participantRef.delete();
      await cancelScheduledReminders(reminderIds);

      setJoined(false);
      await loadParticipants();

      Alert.alert('Done', 'You left this run and reminders were canceled.');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to leave run');
    } finally {
      setLeaving(false);
    }
  };

  const handleOpenChat = () => {
    if (!race) return;

    if (!joined) {
      Alert.alert('Join first', 'You need to join this run to access chat');
      return;
    }

    router.push({
      pathname: '/race-chat',
      params: {
        raceId,
        raceName: race.name,
      },
    });
  };

  const renderParticipant = ({ item }: { item: ParticipantItem }) => {
    const avatarUri = getProfileImage(item.photoURL, item.sex);

    return (
      <View style={styles.participantCard}>
        <Image source={{ uri: avatarUri }} style={styles.participantAvatar} />

        <View style={styles.participantInfo}>
          <Text style={styles.participantName} numberOfLines={1}>
            {item.name}
          </Text>

          <View style={styles.participantMetaRow}>
            <Ionicons name="location-outline" size={15} color="#6C7791" />
            <Text style={styles.participantCity} numberOfLines={1}>
              {item.city}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loadingRace) {
    return (
      <LinearGradient
        colors={['#0F4FD1', '#165FE3', '#0E4BC1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.loadingContainer}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor="#0F4FD1"
          translucent={false}
        />
        <SafeAreaView style={styles.loadingSafeArea} edges={['top', 'bottom']}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>{i18n.t('loading')}</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!race) {
    return (
      <LinearGradient
        colors={['#0F4FD1', '#165FE3', '#0E4BC1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.loadingContainer}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor="#0F4FD1"
          translucent={false}
        />
        <SafeAreaView style={styles.loadingSafeArea} edges={['top', 'bottom']}>
          <Text style={styles.loadingText}>Race not found</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const raceImage = race.imageURL || DEFAULT_RUN_IMAGE;

  return (
    <LinearGradient
      colors={['#0F4FD1', '#165FE3', '#0E4BC1']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screen}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0F4FD1"
        translucent={false}
      />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topHeader}>
            <Pressable onPress={() => router.back()} style={styles.backCircle}>
              <Ionicons name="chevron-back" size={22} color="#1C2440" />
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>{i18n.t('openDetails')}</Text>
            </View>

            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.heroCard}>
            <Image
              source={{ uri: raceImage }}
              style={styles.heroImage}
              resizeMode="cover"
            />

            <View style={styles.heroBody}>
              <Text style={styles.raceTitle}>{race.name}</Text>

              <View style={styles.heroMetaTopRow}>
                <View style={styles.inlineMeta}>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color="#2D3B63"
                  />
                  <Text style={styles.inlineMetaText}>
                    {formatEventDate(race.date, race.time)}
                  </Text>
                </View>
              </View>

              <View style={styles.heroMetaRow}>
                <InfoChip icon="location-outline" text={race.place} />
                {!!race.distance && (
                  <InfoChip
                    icon="swap-horizontal"
                    text={`${race.distance} KM`}
                  />
                )}
              </View>

              <View style={styles.heroMetaRow}>
                {!!race.creatorName && (
                  <View style={[styles.infoChip, styles.creatorChip]}>
                    <Text style={styles.creatorEmoji}>👑</Text>
                    <Text style={styles.infoChipText}>
                      {i18n.t('createdBy')} {race.creatorName}
                    </Text>
                  </View>
                )}

                <View style={[styles.infoChip, styles.peopleChip]}>
                  <Ionicons name="people" size={16} color="#1F8FFF" />
                  <Text style={styles.infoChipText}>
                    {participants.length}/{race.maxParticipants || 20}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {!!race.price && (
            <View style={styles.priceCard}>
              <Ionicons name="cash-outline" size={20} color="#FF4A4A" />
              <Text style={styles.priceText}>{race.price}</Text>
            </View>
          )}

          <View style={styles.aboutCard}>
            <Text style={styles.sectionTitle}>About the run</Text>
            <Text style={styles.description}>{race.description || '-'}</Text>
          </View>

          <Pressable
            style={[
              styles.primaryButtonShell,
              (joined || joining || leaving) && styles.buttonDisabled,
            ]}
            onPress={handleJoin}
            disabled={joined || joining || leaving}
          >
            <LinearGradient
              colors={
                joined
                  ? ['#8492B3', '#919DBA', '#A5AEC6']
                  : ['#14A97D', '#2EC98C', '#61DF9F']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButton}
            >
              <Ionicons
                name={joined ? 'checkmark-circle-outline' : 'walk-outline'}
                size={20}
                color="#fff"
              />
              <Text style={styles.primaryButtonText}>
                {joined
                  ? `${i18n.t('joined')} ✅`
                  : joining
                  ? i18n.t('loading')
                  : leaving
                  ? i18n.t('loading')
                  : i18n.t('joinRun')}
              </Text>
            </LinearGradient>
          </Pressable>

          {joined && (
            <Pressable
              style={[styles.leaveButton, leaving && styles.buttonDisabled]}
              onPress={handleLeave}
              disabled={leaving}
            >
              <Ionicons name="exit-outline" size={20} color="#fff" />
              <Text style={styles.leaveButtonText}>
                {leaving ? i18n.t('loading') : 'Leave run'}
              </Text>
            </Pressable>
          )}

          <Pressable
            style={[
              styles.secondaryButton,
              !joined && styles.secondaryButtonLocked,
            ]}
            onPress={handleOpenChat}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#1C2440" />
            <Text style={styles.secondaryButtonText}>
              {i18n.t('openRaceChat')}
            </Text>
          </Pressable>

          <View style={styles.participantsHeader}>
            <Text style={styles.participantsTitle}>{i18n.t('participants')}</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {participants.length}
                {race.maxParticipants ? `/${race.maxParticipants}` : ''}
              </Text>
            </View>
          </View>

          {loadingParticipants ? (
            <View style={styles.smallInfoCard}>
              <Text style={styles.smallInfoText}>{i18n.t('loading')}</Text>
            </View>
          ) : participants.length === 0 ? (
            <View style={styles.smallInfoCard}>
              <Text style={styles.smallInfoText}>No participants yet.</Text>
            </View>
          ) : (
            <FlatList
              data={participants}
              keyExtractor={(item) => item.id}
              renderItem={renderParticipant}
              scrollEnabled={false}
              contentContainerStyle={styles.participantsList}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
  },

  loadingSafeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  content: {
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 40,
  },

  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  backCircle: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#F7F8FC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#032A7A',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },

  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
    backgroundColor: '#F7F8FC',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#032A7A',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },

  headerTitle: {
    color: '#1C2440',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },

  headerSpacer: {
    width: 52,
    height: 52,
  },

  heroCard: {
    backgroundColor: '#F7F8FC',
    borderRadius: 34,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#032A7A',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
  },

  heroImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#DCE7FF',
  },

  heroBody: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
  },

  raceTitle: {
    color: '#16244A',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 38,
    marginBottom: 12,
  },

  heroMetaTopRow: {
    marginBottom: 10,
  },

  inlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  inlineMetaText: {
    color: '#2D3B63',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 6,
  },

  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 8,
  },

  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8EDF9',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },

  infoChipText: {
    color: '#33456E',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 6,
  },

  creatorChip: {
    maxWidth: 210,
  },

  creatorEmoji: {
    fontSize: 16,
  },

  peopleChip: {
    paddingHorizontal: 12,
  },

  priceCard: {
    backgroundColor: '#F7F8FC',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#B8C0D4',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },

  priceText: {
    color: '#FF4A4A',
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 10,
  },

  aboutCard: {
    backgroundColor: '#F7F8FC',
    borderRadius: 30,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#B8C0D4',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },

  sectionTitle: {
    color: '#16244A',
    fontSize: 23,
    fontWeight: '900',
    marginBottom: 10,
  },

  description: {
    color: '#55617E',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },

  primaryButtonShell: {
    marginBottom: 12,
  },

  primaryButton: {
    minHeight: 58,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#25BF88',
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    marginLeft: 8,
  },

  leaveButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  leaveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 8,
  },

  secondaryButton: {
    minHeight: 56,
    borderRadius: 20,
    backgroundColor: '#F7F8FC',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#B8C0D4',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },

  secondaryButtonLocked: {
    opacity: 0.6,
  },

  secondaryButtonText: {
    color: '#1C2440',
    fontSize: 17,
    fontWeight: '900',
    marginLeft: 8,
  },

  buttonDisabled: {
    opacity: 0.85,
  },

  participantsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  participantsTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginRight: 10,
  },

  countBadge: {
    minWidth: 44,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF4A4A',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },

  countText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  smallInfoCard: {
    backgroundColor: '#F7F8FC',
    borderRadius: 24,
    padding: 18,
    shadowColor: '#B8C0D4',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },

  smallInfoText: {
    color: '#55617E',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },

  participantsList: {
    paddingBottom: 10,
  },

  participantCard: {
    backgroundColor: '#F7F8FC',
    borderRadius: 26,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#B8C0D4',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },

  participantAvatar: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: '#DCE7FF',
    marginRight: 12,
  },

  participantInfo: {
    flex: 1,
  },

  participantName: {
    color: '#1C2440',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },

  participantMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  participantCity: {
    color: '#6C7791',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
});
