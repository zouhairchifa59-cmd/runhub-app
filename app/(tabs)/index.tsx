import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../constants/firebase';
import i18n from '../../translations';

type RaceItem = {
  id: string;
  name: string;
  date: string;
  time: string;
  place: string;
  address?: string;
  distance?: string;
  creatorName?: string;
  creatorId?: string;
  maxParticipants?: number;
  participantsCount: number;
  isToday: boolean;
  isFull: boolean;
  imageURL?: string;
};

type CalendarDay = {
  key: string;
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
};

const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const DEFAULT_RUN_IMAGE =
  'https://res.cloudinary.com/dkj2qsk4z/image/upload/v1774603075/ChatGPT_Image_Mar_27_2026_10_09_21_AM_v3mmga.png';

function isSameDay(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseRaceDate(date: string, time: string) {
  return new Date(`${date}T${time || '00:00'}`);
}

function formatHeaderDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatEventDate(dateString: string) {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

function formatMonthTitle(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function buildCalendarDays(monthDate: Date): CalendarDay[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startWeekDay = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const result: CalendarDay[] = [];

  for (let i = 0; i < startWeekDay; i += 1) {
    const date = new Date(year, month, 1 - (startWeekDay - i));
    result.push({
      key: `empty-start-${i}`,
      date,
      dayNumber: date.getDate(),
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    result.push({
      key: formatDateKey(date),
      date,
      dayNumber: day,
      isCurrentMonth: true,
    });
  }

  while (result.length % 7 !== 0) {
    const nextIndex = result.length - (startWeekDay + daysInMonth) + 1;
    const date = new Date(year, month + 1, nextIndex);
    result.push({
      key: `empty-end-${nextIndex}`,
      date,
      dayNumber: date.getDate(),
      isCurrentMonth: false,
    });
  }

  return result;
}

function getCreatorEmoji(name?: string) {
  if (!name) return '👤';

  const lower = name.toLowerCase();
  if (lower.includes('you')) return '🧢';
  if (lower.includes('yazi')) return '👸';
  if (lower.includes('karifas')) return '👑';

  return '👤';
}

export default function RunListScreen() {
  const [races, setRaces] = useState<RaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarVisible, setCalendarVisible] = useState(false);

  useEffect(() => {
    loadRaces();
  }, []);

  const loadRaces = async () => {
    try {
      setLoading(true);

      const racesSnapshot = await db.collection('races').get();
      const now = new Date();

      const raceDocs = racesSnapshot.docs
        .map((doc) => {
          const data = doc.data() as any;

          return {
            id: doc.id,
            name: data?.name || 'Run',
            date: data?.date || '',
            time: data?.time || '',
            place: data?.place || '',
            address: data?.address || '',
            distance: data?.distance || '',
            creatorName: data?.creatorName || '',
            creatorId: data?.creatorId || '',
            maxParticipants: Number(data?.maxParticipants || 20),
            imageURL: data?.imageURL || data?.photoURL || data?.coverImage || '',
          };
        })
        .filter((race) => {
          if (!race.date || !race.time) return false;
          const raceDate = parseRaceDate(race.date, race.time);
          return raceDate >= now;
        });

      const enrichedRaces: RaceItem[] = await Promise.all(
        raceDocs.map(async (race) => {
          const participantsSnapshot = await db
            .collection('race_participants')
            .where('raceId', '==', race.id)
            .get();

          const participantsCount = participantsSnapshot.size;
          const raceDateTime = parseRaceDate(race.date, race.time);

          return {
            ...race,
            participantsCount,
            isToday: isSameDay(raceDateTime, now),
            isFull: participantsCount >= (race.maxParticipants || 20),
          };
        })
      );

      enrichedRaces.sort((a, b) => {
        const d1 = parseRaceDate(a.date, a.time).getTime();
        const d2 = parseRaceDate(b.date, b.time).getTime();
        return d1 - d2;
      });

      setRaces(enrichedRaces);

      if (enrichedRaces.length > 0) {
        const firstRaceDate = parseRaceDate(
          enrichedRaces[0].date,
          enrichedRaces[0].time
        );
        setSelectedDate(firstRaceDate);
        setMonthDate(
          new Date(firstRaceDate.getFullYear(), firstRaceDate.getMonth(), 1)
        );
      }
    } catch (error: any) {
      console.log('loadRaces error:', error);
      Alert.alert('Error', error?.message || 'Failed to load runs');
    } finally {
      setLoading(false);
    }
  };

  const openRace = (race: RaceItem) => {
    router.push({
      pathname: '/race-details',
      params: { id: race.id },
    });
  };

  const raceDateKeys = useMemo(() => {
    return new Set(races.map((race) => race.date));
  }, [races]);

  const calendarDays = useMemo(() => buildCalendarDays(monthDate), [monthDate]);

  const filteredRuns = useMemo(() => {
    const selectedKey = formatDateKey(selectedDate);
    const term = search.trim().toLowerCase();

    return races.filter((race) => {
      if (race.date !== selectedKey) return false;

      if (!term) return true;

      const haystack = [
        race.name,
        race.place,
        race.address,
        race.creatorName,
        race.distance,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [races, selectedDate, search]);

  const goPrevMonth = () => {
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const onSelectDay = (day: CalendarDay) => {
    if (!day.isCurrentMonth) return;
    setSelectedDate(day.date);
  };

  const handleFilterPress = () => {
    Alert.alert('Filters', 'You can add advanced filters here later.');
  };

  const renderRunCard = ({ item }: { item: RaceItem }) => {
    const imageSource = item.imageURL || DEFAULT_RUN_IMAGE;

    return (
      <Pressable style={styles.card} onPress={() => openRace(item)}>
        <Image
          source={{ uri: imageSource }}
          style={styles.cardImage}
          resizeMode="cover"
        />

        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>

            <View style={styles.rightDateWrap}>
              <Ionicons name="calendar-outline" size={16} color="#2D3B63" />
              <Text style={styles.dateInlineText}>
                {formatEventDate(item.date)} • {item.time}
              </Text>
            </View>
          </View>

          <View style={styles.metaLineRow}>
            <View style={styles.metaInlineItem}>
              <Ionicons name="location-outline" size={18} color="#2D3B63" />
              <Text style={styles.metaInlineText}>{item.place}</Text>
            </View>

            {!!item.distance && (
              <View style={styles.metaInlineItem}>
                <Ionicons name="swap-horizontal" size={18} color="#2D3B63" />
                <Text style={styles.metaInlineText}>{item.distance} KM</Text>
              </View>
            )}
          </View>

          <View style={styles.metaBottomRow}>
            {!!item.creatorName && (
              <View style={[styles.metaChip, styles.metaChipSmall]}>
                <Text style={styles.metaChipEmojiSmall}>
                  {getCreatorEmoji(item.creatorName)}
                </Text>
                <Text style={styles.metaChipTextSmall} numberOfLines={1}>
                  {i18n.t('createdBy')} {item.creatorName}
                </Text>
              </View>
            )}

            <View style={[styles.metaChip, styles.peopleChip]}>
              <Ionicons name="people" size={16} color="#1F8FFF" />
              <Text style={styles.metaChipTextSmall}>
                {item.participantsCount}/{item.maxParticipants || 20}
              </Text>
            </View>

            {item.isToday && (
              <View style={[styles.metaChip, styles.todayChip]}>
                <Text style={styles.todayChipText}>{i18n.t('today')}</Text>
              </View>
            )}

            {item.isFull && (
              <View style={[styles.metaChip, styles.fullChip]}>
                <Text style={styles.fullChipText}>{i18n.t('full')}</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#0F4FD1', '#165FE3', '#0E4BC1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.loading}
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
        <FlatList
          data={filteredRuns}
          keyExtractor={(item) => item.id}
          renderItem={renderRunCard}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              <View style={styles.topShell}>
                <View style={styles.searchBar}>
                  <Ionicons
                    name="search-outline"
                    size={28}
                    color="#8A92AC"
                    style={styles.searchIcon}
                  />

                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search runs..."
                    placeholderTextColor="#8A92AC"
                    style={styles.searchInput}
                  />

                  <Pressable
                    style={styles.searchAction}
                    onPress={() => setCalendarVisible(true)}
                  >
                    <Ionicons name="calendar-outline" size={24} color="#7B839E" />
                  </Pressable>

                  <View style={styles.divider} />

                  <Pressable style={styles.searchAction} onPress={handleFilterPress}>
                    <Ionicons name="filter-outline" size={24} color="#7B839E" />
                  </Pressable>
                </View>
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {formatHeaderDate(selectedDate)}
                </Text>

                <Pressable
                  style={styles.createButtonShell}
                  onPress={() => router.push('/create-race')}
                >
                  <LinearGradient
                    colors={['#14A97D', '#2EC98C', '#61DF9F']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.createBtn}
                  >
                    <Text style={styles.createText}>+ {i18n.t('createRun')}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No runs for this day</Text>
              <Text style={styles.emptyText}>
                Try another day or create a new run.
              </Text>
            </View>
          }
        />

        <Modal
          visible={calendarVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCalendarVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setCalendarVisible(false)}
            />

            <View style={styles.calendarPopupCard}>
              <View style={styles.popupHeader}>
                <Pressable style={styles.monthArrow} onPress={goPrevMonth}>
                  <Ionicons name="chevron-back" size={28} color="#B0B6CC" />
                </Pressable>

                <Text style={styles.monthTitle}>{formatMonthTitle(monthDate)}</Text>

                <Pressable style={styles.monthArrow} onPress={goNextMonth}>
                  <Ionicons name="chevron-forward" size={28} color="#B0B6CC" />
                </Pressable>
              </View>

              <View style={styles.weekRow}>
                {WEEK_DAYS.map((label, index) => (
                  <Text key={`${label}-${index}`} style={styles.weekDayText}>
                    {label}
                  </Text>
                ))}
              </View>

              <View style={styles.daysGrid}>
                {calendarDays.map((day, index) => {
                  const selected = isSameDay(day.date, selectedDate);
                  const hasRuns = raceDateKeys.has(formatDateKey(day.date));
                  const isDimmed = !day.isCurrentMonth;

                  return (
                    <Pressable
                      key={`${day.key}-${index}`}
                      style={[
                        styles.dayCell,
                        selected && styles.dayCellSelected,
                      ]}
                      onPress={() => {
                        onSelectDay(day);
                        if (day.isCurrentMonth) {
                          setCalendarVisible(false);
                        }
                      }}
                      disabled={!day.isCurrentMonth}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isDimmed && styles.dayTextDimmed,
                          selected && styles.dayTextSelected,
                        ]}
                      >
                        {day.dayNumber}
                      </Text>

                      {hasRuns && (
                        <View
                          style={[
                            styles.dayDot,
                            selected && styles.dayDotSelected,
                          ]}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>
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

  listContent: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 36,
  },

  topShell: {
    backgroundColor: '#F5F6FA',
    borderRadius: 34,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    marginBottom: 18,
    shadowColor: '#032A7A',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },

  searchBar: {
    minHeight: 68,
    borderRadius: 28,
    backgroundColor: '#FBFBFD',
    borderWidth: 1,
    borderColor: '#E4E7F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  searchIcon: {
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    color: '#35415F',
    fontSize: 17,
    fontWeight: '600',
  },

  searchAction: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  divider: {
    width: 1,
    height: 30,
    backgroundColor: '#E4E7F0',
    marginHorizontal: 4,
  },

  sectionHeader: {
    marginBottom: 10,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 14,
    paddingLeft: 2,
  },

  createButtonShell: {
    backgroundColor: '#F2F4FA',
    borderRadius: 30,
    padding: 10,
    shadowColor: '#042E88',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
    marginBottom: 10,
  },

  createBtn: {
    minHeight: 62,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  createText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 19,
  },

  card: {
    backgroundColor: '#F7F8FC',
    borderRadius: 34,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#B8C0D4',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
  },

  cardImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#DCE7FF',
  },

  cardBody: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  name: {
    flex: 1,
    fontSize: 22,
    fontWeight: '900',
    color: '#16244A',
    marginRight: 10,
  },

  rightDateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    flexShrink: 1,
  },

  dateInlineText: {
    color: '#2D3B63',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 6,
  },

  metaLineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 12,
  },

  metaInlineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 22,
    marginBottom: 6,
  },

  metaInlineText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '700',
    color: '#223157',
  },

  metaBottomRow: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },

  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8EDF9',
    borderRadius: 14,
    marginRight: 8,
    marginBottom: 6,
  },

  metaChipSmall: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    maxWidth: 170,
  },

  peopleChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  todayChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#1B67E8',
  },

  todayChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },

  fullChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#111827',
  },

  fullChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },

  metaChipEmojiSmall: {
    fontSize: 18,
    marginRight: 4,
  },

  metaChipTextSmall: {
    color: '#33456E',
    fontSize: 11,
    fontWeight: '800',
  },

  emptyCard: {
    backgroundColor: '#F7F8FC',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#B8C0D4',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },

  emptyTitle: {
    color: '#16244A',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },

  emptyText: {
    color: '#66718D',
    fontSize: 15,
    lineHeight: 22,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 18, 42, 0.35)',
  },

  calendarPopupCard: {
    width: '100%',
    backgroundColor: '#F7F8FC',
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingTop: 18,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },

  popupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  monthArrow: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  monthTitle: {
    color: '#16244A',
    fontSize: 24,
    fontWeight: '900',
    marginHorizontal: 22,
  },

  weekRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },

  weekDayText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: '#7E88A7',
    fontSize: 16,
    fontWeight: '700',
  },

  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  dayCell: {
    width: `${100 / 7}%`,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    marginBottom: 8,
  },

  dayCellSelected: {
    backgroundColor: '#5BC29C',
  },

  dayText: {
    color: '#24345C',
    fontSize: 21,
    fontWeight: '700',
    marginBottom: 6,
  },

  dayTextDimmed: {
    color: '#CBD0DF',
  },

  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#5BC29C',
  },

  dayDotSelected: {
    backgroundColor: 'rgba(255,255,255,0.88)',
  },

  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 15,
    fontWeight: '700',
  },
});