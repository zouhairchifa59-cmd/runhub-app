import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../constants/firebase';
import i18n from '../translations';

function formatDateInput(value: string) {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 8);

  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function formatTimeInput(value: string) {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 4);

  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function formatDistanceInput(value: string) {
  return value.replace(/[^0-9]/g, '').slice(0, 3);
}

function formatParticipantsInput(value: string) {
  return value.replace(/[^0-9]/g, '').slice(0, 3);
}

function isValidDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const [year, month, day] = date.split('-').map(Number);
  const d = new Date(year, month - 1, day);

  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

function isValidTime(time: string) {
  if (!/^\d{2}:\d{2}$/.test(time)) return false;

  const [hours, minutes] = time.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function buildRaceDateTime(date: string, time: string) {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export default function CreateRaceScreen() {
  const user = auth.currentUser;
  const scrollRef = useRef<ScrollView>(null);

  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [address, setAddress] = useState('');
  const [distance, setDistance] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const scrollToPosition = (y: number) => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y,
        animated: true,
      });
    }, 180);
  };

  const checkIfUserHasActiveRace = async () => {
    if (!user?.uid) return false;

    const snapshot = await db
      .collection('races')
      .where('creatorId', '==', user.uid)
      .get();

    const now = new Date();

    return snapshot.docs.some((doc) => {
      const data = doc.data() as any;

      if (!data?.date || !data?.time) return false;
      if (!isValidDate(data.date) || !isValidTime(data.time)) return false;

      const raceDateTime = buildRaceDateTime(data.date, data.time);
      return raceDateTime >= now;
    });
  };

  const handleCreateRace = async () => {
    try {
      if (!user?.uid) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      if (
        !name.trim() ||
        !date.trim() ||
        !time.trim() ||
        !place.trim() ||
        !address.trim() ||
        !distance.trim() ||
        !maxParticipants.trim() ||
        !description.trim()
      ) {
        Alert.alert('Error', 'Please fill all fields');
        return;
      }

      if (!isValidDate(date.trim())) {
        Alert.alert('Error', 'Date must be like 2026-04-10');
        return;
      }

      if (!isValidTime(time.trim())) {
        Alert.alert('Error', 'Time must be like 18:30');
        return;
      }

      const distanceNumber = Number(distance);
      if (!distanceNumber || distanceNumber < 1 || distanceNumber > 200) {
        Alert.alert('Error', 'Distance must be between 1 and 200 KM');
        return;
      }

      const participantsNumber = Number(maxParticipants);
      if (!participantsNumber || participantsNumber < 2 || participantsNumber > 500) {
        Alert.alert('Error', 'Participants must be between 2 and 500');
        return;
      }

      const raceDateTime = buildRaceDateTime(date.trim(), time.trim());
      if (raceDateTime <= new Date()) {
        Alert.alert('Error', 'Race date and time must be in the future');
        return;
      }

      setSaving(true);

      const hasActiveRace = await checkIfUserHasActiveRace();

      if (hasActiveRace) {
        Alert.alert(
          'Active race exists',
          'You already have one active race. Wait until its date passes to create a new one.'
        );
        setSaving(false);
        return;
      }

      const userDoc = await db.collection('users').doc(user.uid).get();
      const userData = userDoc.data() as any;

      const newRace = {
        name: name.trim(),
        creatorId: user.uid,
        creatorName: userData?.name || 'Runner',
        date: date.trim(),
        time: time.trim(),
        place: place.trim(),
        address: address.trim(),
        distance: String(distanceNumber),
        maxParticipants: participantsNumber,
        price: 'Free',
        description: description.trim(),
        createdAt: new Date(),
      };

      const raceRef = await db.collection('races').add(newRace);

      await db
        .collection('race_participants')
        .doc(`${raceRef.id}_${user.uid}`)
        .set({
          raceId: raceRef.id,
          userId: user.uid,
          joinedAt: new Date(),
          isCreator: true,
        });

      Alert.alert('Success', 'Your group run was created');
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create race');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0b4cb3"
        translucent={false}
      />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerRow}>
              <Pressable onPress={() => router.back()} style={styles.backButton}>
                <Text style={styles.backButtonText}>‹</Text>
              </Pressable>

              <View style={styles.titleWrap}>
                <Text style={styles.titleText}>{i18n.t('createRunTitle')}</Text>
              </View>

              <View style={styles.headerSpacer} />
            </View>

            <View style={styles.formCard}>
              <Text style={styles.label}>{i18n.t('runName')}</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Morning 10K Prague"
                placeholderTextColor="#6b7280"
              />

              <Text style={styles.label}>{i18n.t('date')}</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={(value) => setDate(formatDateInput(value))}
                placeholder="2026-04-10"
                placeholderTextColor="#6b7280"
                keyboardType="number-pad"
                maxLength={10}
              />

              <Text style={styles.label}>{i18n.t('time')}</Text>
              <TextInput
                style={styles.input}
                value={time}
                onChangeText={(value) => setTime(formatTimeInput(value))}
                placeholder="18:30"
                placeholderTextColor="#6b7280"
                keyboardType="number-pad"
                maxLength={5}
              />

              <Text style={styles.label}>{i18n.t('place')}</Text>
              <TextInput
                style={styles.input}
                value={place}
                onChangeText={setPlace}
                placeholder="Prague"
                placeholderTextColor="#6b7280"
              />

              <Text style={styles.label}>{i18n.t('address')}</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="Letná Park, Prague 7"
                placeholderTextColor="#6b7280"
                onFocus={() => scrollToPosition(180)}
              />

              <Text style={styles.label}>{i18n.t('distance')}</Text>
              <View style={styles.inputWithSuffix}>
                <TextInput
                  style={styles.inputWithSuffixField}
                  value={distance}
                  onChangeText={(value) => setDistance(formatDistanceInput(value))}
                  placeholder="10"
                  placeholderTextColor="#6b7280"
                  keyboardType="number-pad"
                  maxLength={3}
                  onFocus={() => scrollToPosition(240)}
                />
                <Text style={styles.suffixText}>KM</Text>
              </View>

              <Text style={styles.label}>Max Participants</Text>
              <View style={styles.inputWithSuffix}>
                <TextInput
                  style={styles.inputWithSuffixField}
                  value={maxParticipants}
                  onChangeText={(value) =>
                    setMaxParticipants(formatParticipantsInput(value))
                  }
                  placeholder="10"
                  placeholderTextColor="#6b7280"
                  keyboardType="number-pad"
                  maxLength={3}
                  onFocus={() => scrollToPosition(300)}
                />
                <Text style={styles.suffixText}>people</Text>
              </View>

              <Text style={styles.label}>{i18n.t('description')}</Text>
              <TextInput
                style={[styles.input, styles.descriptionInput]}
                value={description}
                onChangeText={setDescription}
                placeholder="Easy pace, friendly group, everyone welcome."
                placeholderTextColor="#6b7280"
                multiline
                textAlignVertical="top"
                onFocus={() => scrollToPosition(360)}
              />

              <Pressable
                style={[styles.createButton, saving && styles.createButtonDisabled]}
                onPress={handleCreateRace}
                disabled={saving}
              >
                <Text style={styles.createButtonText}>
                  {saving ? i18n.t('loading') : i18n.t('createRun')}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0b4cb3',
  },

  safeArea: {
    flex: 1,
  },

  keyboardWrap: {
    flex: 1,
  },

  container: {
    paddingTop: 16,
    paddingBottom: 40,
    paddingHorizontal: 22,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  backButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#f7f7f7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  backButtonText: {
    fontSize: 32,
    color: '#1c1b2b',
    fontWeight: '700',
    marginTop: -4,
  },

  titleWrap: {
    flex: 1,
    marginHorizontal: 12,
    backgroundColor: '#f7f7f7',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 18,
  },

  titleText: {
    color: '#1c1b2b',
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 1.2,
    textAlign: 'center',
  },

  headerSpacer: {
    width: 52,
    height: 52,
  },

  formCard: {
    backgroundColor: '#f7f7f7',
    borderRadius: 30,
    padding: 20,
  },

  label: {
    color: '#1c1b2b',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 12,
  },

  input: {
    backgroundColor: '#eef2ff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },

  inputWithSuffix: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderRadius: 16,
    paddingHorizontal: 16,
  },

  inputWithSuffixField: {
    flex: 1,
    paddingVertical: 16,
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },

  suffixText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '900',
    marginLeft: 12,
  },

  descriptionInput: {
    minHeight: 130,
    maxHeight: 220,
  },

  createButton: {
    backgroundColor: '#ff3b3b',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 22,
  },

  createButtonDisabled: {
    opacity: 0.7,
  },

  createButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
});