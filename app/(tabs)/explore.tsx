import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MatchModal from '../../components/MatchModal';
import { auth, db } from '../../constants/firebase';
import i18n from '../../translations';
import { getProfileImage } from '../../utils/avatar';
import {
  formatDistanceDisplay,
  formatPaceDisplay,
} from '../../utils/profileFormat';

const { width, height } = Dimensions.get('window');

const SWIPE_THRESHOLD = 120;
const CARD_WIDTH = width * 0.88;
const CARD_HEIGHT = height * 0.8;

const HEADER_LOGO =
  'https://res.cloudinary.com/dkj2qsk4z/image/upload/v1774607271/logo-header_vvyhdi.png';

type ExploreUser = {
  id: string;
  name?: string;
  city?: string;
  pace?: string;
  photoURL?: string;
  age?: number;
  distance?: string;
  runType?: string;
  sex?: string;
  runWithDog?: string;
  runWithMusic?: string;
  preferredTime?: string;
  surface?: string;
  goal?: string;
  level?: string;
  latitude?: number;
  longitude?: number;
};

type FilterSex = 'Male' | 'Female' | '';
type FilterRunType = 'Road' | 'Trail' | '';
type YesNoFilter = 'Yes' | 'No' | '';
type LocationFilter = 'same-city' | 'nearby' | 'all';
type LocationStatus = 'checking' | 'granted' | 'denied' | 'unsupported';

const NEARBY_RADIUS_KM = 25;

function normalizeCity(city?: string) {
  return (city || '').trim().toLowerCase();
}

function getDistanceKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);

  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(aLat)) *
      Math.cos(toRad(bLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return earthRadiusKm * c;
}

function readCoordinates(data: any) {
  const latCandidates = [
    data?.latitude,
    data?.lat,
    data?.locationLat,
    data?.coords?.latitude,
  ];
  const lngCandidates = [
    data?.longitude,
    data?.lng,
    data?.locationLng,
    data?.coords?.longitude,
  ];

  const lat = latCandidates.find((value) => typeof value === 'number');
  const lng = lngCandidates.find((value) => typeof value === 'number');

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }

  return { latitude: lat, longitude: lng };
}

function FilterOptionButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.filterOptionButton, active && styles.filterOptionButtonActive]}
      onPress={onPress}
    >
      <Text
        style={[styles.filterOptionText, active && styles.filterOptionTextActive]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function InfoChip({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  if (!text || !text.trim()) return null;

  return (
    <View style={styles.infoChip}>
      <Ionicons name={icon} size={18} color="#6C7895" />
      <Text style={styles.infoChipText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

export default function ExploreScreen() {
  const currentUser = auth.currentUser;

  const [allUsers, setAllUsers] = useState<ExploreUser[]>([]);
  const [users, setUsers] = useState<ExploreUser[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [filtersVisible, setFiltersVisible] = useState(false);

  const [selectedSex, setSelectedSex] = useState<FilterSex>('');
  const [selectedRunType, setSelectedRunType] = useState<FilterRunType>('');
  const [selectedDog, setSelectedDog] = useState<YesNoFilter>('');
  const [selectedLocationFilter, setSelectedLocationFilter] =
    useState<LocationFilter>('same-city');

  const [draftSex, setDraftSex] = useState<FilterSex>('');
  const [draftRunType, setDraftRunType] = useState<FilterRunType>('');
  const [draftDog, setDraftDog] = useState<YesNoFilter>('');
  const [draftLocationFilter, setDraftLocationFilter] =
    useState<LocationFilter>('same-city');

  const [matchVisible, setMatchVisible] = useState(false);
  const [matchMessage, setMatchMessage] = useState('');
  const [matchedUser, setMatchedUser] = useState<ExploreUser | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [currentUserCity, setCurrentUserCity] = useState('');
  const [currentUserCoords, setCurrentUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationStatus, setLocationStatus] =
    useState<LocationStatus>('checking');
  const [lastLocationSyncAt, setLastLocationSyncAt] = useState<number | null>(
    null
  );

  const position = useRef(new Animated.ValueXY()).current;
  const watchIdRef = useRef<number | null>(null);
  const lastSyncedLocationRef = useRef<{
    latitude: number;
    longitude: number;
    at: number;
  } | null>(null);

  const syncLiveLocation = useCallback(
    async (latitude: number, longitude: number) => {
      if (!currentUser?.uid) return;

      const last = lastSyncedLocationRef.current;
      const now = Date.now();

      if (last) {
        const movedKm = getDistanceKm(
          last.latitude,
          last.longitude,
          latitude,
          longitude
        );
        const movedMeters = movedKm * 1000;
        const elapsedMs = now - last.at;

        if (movedMeters < 50 && elapsedMs < 30_000) {
          return;
        }
      }

      lastSyncedLocationRef.current = {
        latitude,
        longitude,
        at: now,
      };

      setCurrentUserCoords({ latitude, longitude });
      setLastLocationSyncAt(now);
      setLocationStatus('granted');

      await db.collection('users').doc(currentUser.uid).set(
        {
          latitude,
          longitude,
          locationUpdatedAt: new Date(),
        },
        { merge: true }
      );
    },
    [currentUser?.uid]
  );

  useEffect(() => {
    if (!currentUser?.uid) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationStatus('unsupported');
      return;
    }

    setLocationStatus('checking');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void syncLiveLocation(
          position.coords.latitude,
          position.coords.longitude
        );
      },
      () => {
        setLocationStatus('denied');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        void syncLiveLocation(
          position.coords.latitude,
          position.coords.longitude
        );
      },
      () => {
        setLocationStatus('denied');
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 15000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [currentUser?.uid, syncLiveLocation]);

  const filterUsers = useCallback((
    sourceUsers: ExploreUser[],
    sexFilter: FilterSex,
    runTypeFilter: FilterRunType,
    dogFilter: YesNoFilter,
    locationFilter: LocationFilter
  ) => {
    return sourceUsers.filter((user) => {
      const sexOk = !sexFilter || user.sex === sexFilter;
      const runTypeOk = !runTypeFilter || user.runType === runTypeFilter;
      const dogOk = !dogFilter || user.runWithDog === dogFilter;
      const normalizedCurrentCity = normalizeCity(currentUserCity);
      const normalizedUserCity = normalizeCity(user.city);

      let locationOk = true;

      if (locationFilter === 'same-city') {
        locationOk =
          !normalizedCurrentCity || normalizedCurrentCity === normalizedUserCity;
      } else if (locationFilter === 'nearby') {
        if (
          currentUserCoords &&
          typeof user.latitude === 'number' &&
          typeof user.longitude === 'number'
        ) {
          locationOk =
            getDistanceKm(
              currentUserCoords.latitude,
              currentUserCoords.longitude,
              user.latitude,
              user.longitude
            ) <= NEARBY_RADIUS_KM;
        } else {
          locationOk =
            !normalizedCurrentCity || normalizedCurrentCity === normalizedUserCity;
        }
      }

      return sexOk && runTypeOk && dogOk && locationOk;
    });
  }, [currentUserCity, currentUserCoords]);

  const loadUsers = useCallback(async () => {
    try {
      if (!currentUser?.uid) {
        setLoading(false);
        return;
      }

      const currentUid = currentUser.uid;
      const currentUserDoc = await db.collection('users').doc(currentUid).get();
      const currentUserData = (currentUserDoc.data() as any) || {};
      const currentCoords = readCoordinates(currentUserData);

      setCurrentUserCity(currentUserData?.city || '');
      setCurrentUserCoords(currentCoords);

      const [usersSnapshot, likesSnapshot, passesSnapshot, matchesSnapshot] =
        await Promise.all([
          db.collection('users').get(),
          db.collection('users').doc(currentUid).collection('likes').get(),
          db.collection('users').doc(currentUid).collection('passes').get(),
          db.collection('matches').get(),
        ]);

      const likedIds = new Set<string>();
      const passedIds = new Set<string>();
      const matchedIds = new Set<string>();

      likesSnapshot.forEach((doc) => likedIds.add(doc.id));
      passesSnapshot.forEach((doc) => passedIds.add(doc.id));

      matchesSnapshot.forEach((doc) => {
        const data = doc.data() as any;
        if (
          data?.users &&
          Array.isArray(data.users) &&
          data.users.includes(currentUid)
        ) {
          data.users.forEach((uid: string) => {
            if (uid !== currentUid) matchedIds.add(uid);
          });
        }
      });

      const list: ExploreUser[] = [];

      usersSnapshot.forEach((doc) => {
        if (doc.id === currentUid) return;
        if (likedIds.has(doc.id)) return;
        if (passedIds.has(doc.id)) return;
        if (matchedIds.has(doc.id)) return;

        const data = doc.data() as any;

        list.push({
          id: doc.id,
          name: data?.name || '',
          city: data?.city || '',
          pace: data?.pace || '',
          photoURL: data?.photoURL || '',
          age: typeof data?.age === 'number' ? data.age : undefined,
          distance: data?.distance || '',
          runType: data?.runType || '',
          sex: data?.sex || '',
          runWithDog: data?.runWithDog || '',
          runWithMusic: data?.runWithMusic || '',
          preferredTime: data?.preferredTime || '',
          surface: data?.surface || '',
          goal: data?.goal || '',
          level: data?.level || '',
          latitude: readCoordinates(data)?.latitude,
          longitude: readCoordinates(data)?.longitude,
        });
      });

      const filtered = filterUsers(
        list,
        selectedSex,
        selectedRunType,
        selectedDog,
        selectedLocationFilter
      );

      setAllUsers(list);
      setUsers(filtered);
      setCurrentIndex(0);
      position.setValue({ x: 0, y: 0 });
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load runners');
    } finally {
      setLoading(false);
    }
  }, [
    currentUser?.uid,
    filterUsers,
    position,
    selectedDog,
    selectedLocationFilter,
    selectedRunType,
    selectedSex,
  ]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openFilters = () => {
    setDraftSex(selectedSex);
    setDraftRunType(selectedRunType);
    setDraftDog(selectedDog);
    setDraftLocationFilter(selectedLocationFilter);
    setFiltersVisible(true);
  };

  const closeFilters = () => setFiltersVisible(false);

  const applyFilters = () => {
    const filtered = filterUsers(
      allUsers,
      draftSex,
      draftRunType,
      draftDog,
      draftLocationFilter
    );

    setSelectedSex(draftSex);
    setSelectedRunType(draftRunType);
    setSelectedDog(draftDog);
    setSelectedLocationFilter(draftLocationFilter);

    setUsers(filtered);
    setCurrentIndex(0);
    position.setValue({ x: 0, y: 0 });
    setFiltersVisible(false);
  };

  const clearDraftFilters = () => {
    setDraftSex('');
    setDraftRunType('');
    setDraftDog('');
    setDraftLocationFilter('same-city');
  };

  const clearAllFilters = () => {
    setSelectedSex('');
    setSelectedRunType('');
    setSelectedDog('');
    setSelectedLocationFilter('same-city');

    setDraftSex('');
    setDraftRunType('');
    setDraftDog('');
    setDraftLocationFilter('same-city');

    const filtered = filterUsers(allUsers, '', '', '', 'same-city');
    setUsers(filtered);
    setCurrentIndex(0);
    position.setValue({ x: 0, y: 0 });
  };

  const hasActiveFilters = Boolean(
    selectedSex ||
      selectedRunType ||
      selectedDog ||
      selectedLocationFilter !== 'same-city'
  );

  const locationStatusText =
    locationStatus === 'granted'
      ? `Live location ${lastLocationSyncAt ? '• updated' : ''}`
      : locationStatus === 'checking'
      ? 'Checking location...'
      : locationStatus === 'denied'
      ? 'Location denied'
      : 'Location unavailable';

  const locationStatusColor =
    locationStatus === 'granted'
      ? '#0D9F6E'
      : locationStatus === 'checking'
      ? '#C08400'
      : '#DC2626';

  const handleOpenDeviceSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert('Location', 'Please open device settings manually.');
    }
  };

  const rotate = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-7deg', '0deg', '7deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [20, 100, 150],
    outputRange: [0, 0.55, 1],
    extrapolate: 'clamp',
  });

  const passOpacity = position.x.interpolate({
    inputRange: [-150, -100, -20],
    outputRange: [1, 0.55, 0],
    extrapolate: 'clamp',
  });

  const nextCardScale = position.x.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: [0.985, 0.965, 0.985],
    extrapolate: 'clamp',
  });

  const nextCardTranslateY = position.x.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: [10, 18, 10],
    extrapolate: 'clamp',
  });

  const createMatchIfMutual = useCallback(async (otherUser: ExploreUser) => {
    if (!currentUser?.uid || !otherUser?.id) return;

    const otherLikedMe = await db
      .collection('users')
      .doc(otherUser.id)
      .collection('likes')
      .doc(currentUser.uid)
      .get();

    if (!otherLikedMe.exists) return;

    const usersSorted = [currentUser.uid, otherUser.id].sort();
    const matchId = `${usersSorted[0]}_${usersSorted[1]}`;

    const existingMatch = await db.collection('matches').doc(matchId).get();

    if (!existingMatch.exists) {
      await db.collection('matches').doc(matchId).set({
        users: usersSorted,
        createdAt: new Date(),
        lastMessage: '',
        lastMessageAt: null,
        unreadCounts: {
          [usersSorted[0]]: 0,
          [usersSorted[1]]: 0,
        },
        openedBy: {
          [usersSorted[0]]: false,
          [usersSorted[1]]: false,
        },
      });
    }

    setMatchedUser(otherUser);
    setMatchMessage('');
    setMatchVisible(true);
  }, [currentUser?.uid]);

  const handleLikeSave = useCallback(async (otherUser: ExploreUser) => {
    if (!currentUser?.uid || !otherUser?.id) return;

    await db
      .collection('users')
      .doc(currentUser.uid)
      .collection('likes')
      .doc(otherUser.id)
      .set({
        userId: otherUser.id,
        likedAt: new Date(),
      });

    await createMatchIfMutual(otherUser);
  }, [createMatchIfMutual, currentUser?.uid]);

  const handlePassSave = useCallback(async (otherUserId: string) => {
    if (!currentUser?.uid) return;

    await db
      .collection('users')
      .doc(currentUser.uid)
      .collection('passes')
      .doc(otherUserId)
      .set({
        userId: otherUserId,
        passedAt: new Date(),
      });
  }, [currentUser?.uid]);

  const moveToNextCard = useCallback(() => {
    position.setValue({ x: 0, y: 0 });
    setCurrentIndex((prev) => prev + 1);
  }, [position]);

  const forceSwipe = useCallback((direction: 'left' | 'right') => {
    if (isSwiping) return;
    setIsSwiping(true);

    const swipeDistance = direction === 'right' ? width + 140 : -width - 140;

    Animated.timing(position, {
      toValue: { x: swipeDistance, y: 0 },
      duration: 220,
      useNativeDriver: false,
    }).start(async () => {
      try {
        const swipedUser = users[currentIndex];

        if (!swipedUser?.id) {
          moveToNextCard();
          return;
        }

        if (direction === 'right') {
          await handleLikeSave(swipedUser);
        } else {
          await handlePassSave(swipedUser.id);
        }
      } catch (error: any) {
        Alert.alert('Error', error?.message || 'Action failed');
      } finally {
        setIsSwiping(false);
        moveToNextCard();
      }
    });
  }, [currentIndex, handleLikeSave, handlePassSave, isSwiping, moveToNextCard, position, users]);

  const resetPosition = useCallback(() => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 5,
      tension: 75,
      useNativeDriver: false,
    }).start();
  }, [position]);

  const handlePass = useCallback(() => forceSwipe('left'), [forceSwipe]);
  const handleLike = useCallback(() => forceSwipe('right'), [forceSwipe]);

  const handleSendMatchMessage = async () => {
    if (!currentUser?.uid || !matchedUser?.id) {
      setMatchVisible(false);
      return;
    }

    const trimmed = matchMessage.trim();
    const usersSorted = [currentUser.uid, matchedUser.id].sort();
    const matchId = `${usersSorted[0]}_${usersSorted[1]}`;

    if (!trimmed) {
      setMatchVisible(false);
      return;
    }

    await db.collection('matches').doc(matchId).collection('messages').add({
      text: trimmed,
      senderId: currentUser.uid,
      createdAt: new Date(),
      seenBy: {
        [currentUser.uid]: true,
        [matchedUser.id]: false,
      },
    });

    await db.collection('matches').doc(matchId).update({
      lastMessage: trimmed,
      lastMessageAt: new Date(),
      [`unreadCounts.${matchedUser.id}`]: 1,
      [`unreadCounts.${currentUser.uid}`]: 0,
      [`openedBy.${currentUser.uid}`]: true,
    });

    setMatchVisible(false);
    setMatchMessage('');
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          !isSwiping &&
          (Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6),
        onPanResponderMove: (_, gesture) => {
          position.setValue({ x: gesture.dx, y: gesture.dy * 0.08 });
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > SWIPE_THRESHOLD) {
            forceSwipe('right');
          } else if (gesture.dx < -SWIPE_THRESHOLD) {
            forceSwipe('left');
          } else {
            resetPosition();
          }
        },
      }),
    [forceSwipe, isSwiping, position, resetPosition]
  );

  const renderEmpty = () => {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIconBox}>
          <Ionicons name="sparkles-outline" size={34} color="#111827" />
        </View>

        <Text style={styles.emptyTitle}>{i18n.t('noMoreRunners')}</Text>
        <Text style={styles.emptyText}>
          Refresh later to discover more runners around you.
        </Text>

        {hasActiveFilters && (
          <Pressable
            style={[styles.emptyButton, styles.emptySecondaryButton]}
            onPress={clearAllFilters}
          >
            <Text style={styles.emptySecondaryButtonText}>
              {i18n.t('clearFilters')}
            </Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.emptyButton, styles.emptyPrimaryButton]}
          onPress={loadUsers}
        >
          <Text style={styles.emptyPrimaryButtonText}>{i18n.t('refresh')}</Text>
        </Pressable>
      </View>
    );
  };

  const renderCard = (user: ExploreUser, index: number) => {
    if (index < currentIndex) return null;

    const isCurrent = index === currentIndex;
    const isNext = index === currentIndex + 1;

    if (!isCurrent && !isNext) return null;

    const animatedStyle = isCurrent
      ? {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { rotate },
          ],
        }
      : {
          transform: [{ scale: nextCardScale }, { translateY: nextCardTranslateY }],
          opacity: 0.92,
        };

    const imageUri = getProfileImage(user.photoURL, user.sex);

    const runTypeLabel =
      user.runType === 'Road'
        ? i18n.t('road')
        : user.runType === 'Trail'
        ? i18n.t('trail')
        : user.runType || '-';

    const sexLabel =
      user.sex === 'Male'
        ? i18n.t('male')
        : user.sex === 'Female'
        ? i18n.t('female')
        : user.sex || '-';

    return (
      <Animated.View
        key={user.id}
        style={[styles.card, animatedStyle, { zIndex: isCurrent ? 10 : 5 }]}
        {...(isCurrent ? panResponder.panHandlers : {})}
      >
        <View style={styles.cardShell}>
          <View style={styles.imageFrame}>
            <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="cover" />

            <View style={styles.topBadgesRow}>
              {!!user.runType && (
                <View style={styles.badgePrimary}>
                  <Text style={styles.badgePrimaryText}>{runTypeLabel}</Text>
                </View>
              )}

              {!!user.sex && (
                <View style={styles.badgeSecondary}>
                  <Text style={styles.badgeSecondaryText}>{sexLabel}</Text>
                </View>
              )}
            </View>

            {isCurrent && (
              <>
                <Animated.View style={[styles.likeStamp, { opacity: likeOpacity }]}>
                  <Ionicons name="walk-outline" size={16} color="#fff" />
                  <Text style={styles.likeStampText}>RUN</Text>
                </Animated.View>

                <Animated.View style={[styles.passStamp, { opacity: passOpacity }]}>
                  <Ionicons name="close-outline" size={16} color="#fff" />
                  <Text style={styles.passStampText}>SKIP</Text>
                </Animated.View>
              </>
            )}
          </View>

          <View style={styles.infoCard}>
            <View style={styles.nameAgeRow}>
              <Text style={styles.nameText} numberOfLines={1}>
                {user.name || 'Runner'}
                {!!user.age && <Text style={styles.ageInline}> {user.age}</Text>}
              </Text>
            </View>

            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={17} color="#8A92AC" />
              <Text style={styles.locationText} numberOfLines={1}>
                {user.city || 'Prague'}
              </Text>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricBox}>
                <Ionicons name="swap-horizontal" size={18} color="#6C7895" />
                <Text style={styles.metricText}>
                  {formatDistanceDisplay(user.distance)}
                </Text>
              </View>

              <View style={styles.metricBoxLast}>
                <Ionicons name="speedometer-outline" size={18} color="#6C7895" />
                <Text style={styles.metricText}>
                  {formatPaceDisplay(user.pace)}
                </Text>
              </View>
            </View>

            <View style={styles.compactInfoWrap}>
              <InfoChip
                icon="paw-outline"
                text={`Dog: ${user.runWithDog || 'No'}`}
              />
              <InfoChip
                icon="moon-outline"
                text={`Time ${user.preferredTime || 'Any'}`}
              />
              <InfoChip
                icon="trending-up-outline"
                text={user.level || ''}
              />
              <InfoChip
                icon="map-outline"
                text={user.surface || ''}
              />
              <InfoChip
                icon="people-outline"
                text={user.goal || ''}
              />
            </View>

            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.skipButton, isSwiping && styles.actionDisabled]}
                onPress={handlePass}
                disabled={isSwiping}
              >
                <Ionicons name="arrow-forward-outline" size={20} color="#8B93AA" />
                <Text style={styles.skipButtonText}>{i18n.t('skip')}</Text>
              </Pressable>

              <Pressable
                style={[styles.runButtonPressable, isSwiping && styles.actionDisabled]}
                onPress={handleLike}
                disabled={isSwiping}
              >
                <LinearGradient
                  colors={['#28C987', '#52D89A', '#7AE2AF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.runTogetherButton}
                >
                  {isSwiping ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="walk-outline" size={22} color="#fff" />
                      <Text style={styles.runTogetherText}>
                        {i18n.t('runTogether')}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  if (loading) {
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
        <SafeAreaView style={styles.loadingSafeArea} edges={['top']}>
          <Image
            source={{ uri: HEADER_LOGO }}
            style={styles.loadingLogo}
            resizeMode="contain"
          />
          <Text style={styles.loadingText}>{i18n.t('loadingRunners')}</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0F4FD1', '#165FE3', '#0E4BC1']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screenGradient}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0F4FD1"
        translucent={false}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={{ uri: HEADER_LOGO }}
              style={styles.headerLogo}
              resizeMode="contain"
            />

            <View
              style={[
                styles.locationStatusChip,
                { borderColor: locationStatusColor },
              ]}
            >
              <View
                style={[
                  styles.locationStatusDot,
                  { backgroundColor: locationStatusColor },
                ]}
              />
              <Text
                style={[
                  styles.locationStatusText,
                  { color: locationStatusColor },
                ]}
              >
                {locationStatusText}
              </Text>
            </View>

            {locationStatus === 'denied' && (
              <Pressable
                style={styles.locationSettingsButton}
                onPress={handleOpenDeviceSettings}
              >
                <Text style={styles.locationSettingsButtonText}>
                  Open location settings
                </Text>
              </Pressable>
            )}
          </View>

          <Pressable
            style={styles.floatingFilterBtn}
            onPress={openFilters}
            disabled={isSwiping}
          >
            <Ionicons name="options-outline" size={21} color="#20263A" />
            {hasActiveFilters && <View style={styles.filterDot} />}
          </Pressable>
        </View>

        <View style={styles.deck}>
          {currentIndex >= users.length
            ? renderEmpty()
            : users.map((user, index) => renderCard(user, index))}
        </View>

        <Modal
          visible={filtersVisible}
          transparent
          animationType="fade"
          onRequestClose={closeFilters}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={closeFilters} />

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.filterModalCard}>
                <View style={styles.filterModalHeader}>
                  <Text style={styles.filterModalTitle}>{i18n.t('filters')}</Text>

                  <Pressable style={styles.filterCloseButton} onPress={closeFilters}>
                    <Ionicons name="close" size={22} color="#1C1B2B" />
                  </Pressable>
                </View>

                <Text style={styles.filterGroupTitle}>{i18n.t('sex')}</Text>
                <View style={styles.filterGrid}>
                  <FilterOptionButton
                    label={i18n.t('male')}
                    active={draftSex === 'Male'}
                    onPress={() =>
                      setDraftSex((prev) => (prev === 'Male' ? '' : 'Male'))
                    }
                  />
                  <FilterOptionButton
                    label={i18n.t('female')}
                    active={draftSex === 'Female'}
                    onPress={() =>
                      setDraftSex((prev) => (prev === 'Female' ? '' : 'Female'))
                    }
                  />
                </View>

                <Text style={styles.filterGroupTitle}>Location</Text>
                <View style={styles.filterGrid}>
                  <FilterOptionButton
                    label="Same city"
                    active={draftLocationFilter === 'same-city'}
                    onPress={() =>
                      setDraftLocationFilter((prev) =>
                        prev === 'same-city' ? 'all' : 'same-city'
                      )
                    }
                  />
                  <FilterOptionButton
                    label={`Nearby (${NEARBY_RADIUS_KM}km)`}
                    active={draftLocationFilter === 'nearby'}
                    onPress={() =>
                      setDraftLocationFilter((prev) =>
                        prev === 'nearby' ? 'all' : 'nearby'
                      )
                    }
                  />
                  <FilterOptionButton
                    label="All"
                    active={draftLocationFilter === 'all'}
                    onPress={() => setDraftLocationFilter('all')}
                  />
                </View>

                <Text style={styles.filterGroupTitle}>{i18n.t('runType')}</Text>
                <View style={styles.filterGrid}>
                  <FilterOptionButton
                    label={i18n.t('road')}
                    active={draftRunType === 'Road'}
                    onPress={() =>
                      setDraftRunType((prev) => (prev === 'Road' ? '' : 'Road'))
                    }
                  />
                  <FilterOptionButton
                    label={i18n.t('trail')}
                    active={draftRunType === 'Trail'}
                    onPress={() =>
                      setDraftRunType((prev) => (prev === 'Trail' ? '' : 'Trail'))
                    }
                  />
                </View>

                <Text style={styles.filterGroupTitle}>Run with dog</Text>
                <View style={styles.filterGrid}>
                  <FilterOptionButton
                    label="Yes"
                    active={draftDog === 'Yes'}
                    onPress={() => setDraftDog((prev) => (prev === 'Yes' ? '' : 'Yes'))}
                  />
                  <FilterOptionButton
                    label="No"
                    active={draftDog === 'No'}
                    onPress={() => setDraftDog((prev) => (prev === 'No' ? '' : 'No'))}
                  />
                </View>

                <View style={styles.modalButtonsRow}>
                  <Pressable
                    style={[styles.modalActionButton, styles.clearFilterButton]}
                    onPress={clearDraftFilters}
                  >
                    <Text style={styles.clearFilterButtonText}>{i18n.t('clear')}</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.modalActionButton, styles.applyFilterButton]}
                    onPress={applyFilters}
                  >
                    <Text style={styles.applyFilterButtonText}>
                      {i18n.t('applyFilters')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>

        <MatchModal
          visible={matchVisible}
          currentUser={{
            photoURL: currentUser?.photoURL || '',
            sex: '',
            name: currentUser?.displayName || '',
          }}
          matchedUser={{
            name: matchedUser?.name || '',
            photoURL: matchedUser?.photoURL || '',
            sex: matchedUser?.sex || '',
          }}
          messageText={matchMessage}
          onChangeMessage={setMatchMessage}
          onClose={() => {
            setMatchVisible(false);
            setMatchMessage('');
          }}
          onSendMessage={handleSendMatchMessage}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screenGradient: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
  },

  header: {
    paddingHorizontal: 18,
    paddingTop: 8,
    marginBottom: 6,
    position: 'relative',
  },

  headerLogo: {
    width: 180,
    height: 44,
  },

  headerLeft: {
    alignItems: 'flex-start',
    paddingRight: 66,
  },

  locationStatusChip: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  locationStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginRight: 6,
  },

  locationStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },

  locationSettingsButton: {
    marginTop: 6,
    backgroundColor: '#FFE5E5',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },

  locationSettingsButtonText: {
    color: '#C21D1D',
    fontSize: 12,
    fontWeight: '800',
  },

  loadingSafeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingLogo: {
    width: 200,
    height: 52,
    marginBottom: 18,
  },

  floatingFilterBtn: {
    position: 'absolute',
    right: 18,
    top: 4,
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00194D',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },

  filterDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#FF7E63',
  },

  deck: {
    flex: 1,
    width: CARD_WIDTH,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 110,
  },

  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },

  cardShell: {
    flex: 1,
    backgroundColor: '#EAF0FF',
    borderRadius: 42,
    padding: 14,
    shadowColor: '#00194D',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 9,
  },

  imageFrame: {
    height: '53%',
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#F5F7FC',
    position: 'relative',
  },

  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F7FC',
  },

  topBadgesRow: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    zIndex: 5,
  },

  badgePrimary: {
    backgroundColor: '#FF976D',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 10,
    shadowColor: '#FF976D',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  badgePrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  badgeSecondary: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },

  badgeSecondaryText: {
    color: '#25304D',
    fontSize: 14,
    fontWeight: '900',
  },

  likeStamp: {
    position: 'absolute',
    top: 72,
    left: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#21BA72',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 5,
    transform: [{ rotate: '-7deg' }],
  },

  likeStampText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    marginLeft: 6,
  },

  passStamp: {
    position: 'absolute',
    top: 72,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 5,
    transform: [{ rotate: '7deg' }],
  },

  passStampText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    marginLeft: 6,
  },

  infoCard: {
    flex: 1,
    backgroundColor: '#F9FAFE',
    marginTop: -12,
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
  },

  nameAgeRow: {
    marginBottom: 8,
  },

  nameText: {
    color: '#1F2434',
    fontSize: 30,
    fontWeight: '900',
  },

  ageInline: {
    fontSize: 22,
    color: '#7F89A8',
    fontWeight: '700',
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  locationText: {
    color: '#8089A4',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 6,
  },

  metricsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },

  metricBox: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#F1F4FA',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginRight: 10,
  },

  metricBoxLast: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#F1F4FA',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  metricText: {
    color: '#2A3552',
    fontSize: 15,
    fontWeight: '900',
    marginLeft: 8,
  },

  compactInfoWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },

  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF1FB',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginRight: 10,
    marginBottom: 10,
    maxWidth: '48%',
  },

  infoChipText: {
    color: '#596684',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 8,
    flexShrink: 1,
  },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  skipButton: {
    width: 120,
    height: 56,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E7EBF3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  skipButtonText: {
    marginLeft: 6,
    color: '#7F879F',
    fontSize: 15,
    fontWeight: '900',
  },

  runButtonPressable: {
    flex: 1,
  },

  runTogetherButton: {
    height: 56,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#2AC98B',
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },

  runTogetherText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 17,
    fontWeight: '900',
  },

  emptyWrap: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT * 0.82,
    backgroundColor: '#FFFFFF',
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    shadowColor: '#00194D',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },

  emptyIconBox: {
    width: 82,
    height: 82,
    borderRadius: 26,
    backgroundColor: '#F1F4FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },

  emptyTitle: {
    color: '#1D2435',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },

  emptyText: {
    color: '#6C7489',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },

  emptyButton: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },

  emptyPrimaryButton: {
    backgroundColor: '#16A34A',
  },

  emptyPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  emptySecondaryButton: {
    backgroundColor: '#111827',
  },

  emptySecondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    color: '#EAF0FF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionDisabled: {
    opacity: 0.6,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },

  modalScroll: {
    width: '100%',
  },

  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },

  filterModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },

  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  filterModalTitle: {
    color: '#1C1B2B',
    fontSize: 24,
    fontWeight: '900',
  },

  filterCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  filterGroupTitle: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
    marginTop: 8,
  },

  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  filterOptionButton: {
    width: '48%',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },

  filterOptionButtonActive: {
    backgroundColor: '#1B67E8',
  },

  filterOptionText: {
    color: '#1C1B2B',
    fontSize: 17,
    fontWeight: '800',
  },

  filterOptionTextActive: {
    color: '#FFFFFF',
  },

  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },

  modalActionButton: {
    width: '48%',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },

  clearFilterButton: {
    backgroundColor: '#E5E7EB',
  },

  clearFilterButtonText: {
    color: '#1C1B2B',
    fontSize: 16,
    fontWeight: '900',
  },

  applyFilterButton: {
    backgroundColor: '#111827',
  },

  applyFilterButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
});
