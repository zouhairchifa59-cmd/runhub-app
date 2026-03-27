import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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

type YesNoOption = 'Yes' | 'No' | '';
type RunTypeOption = 'Road' | 'Trail' | '';
type SexOption = 'Male' | 'Female' | '';
type PreferredTimeOption = 'Morning' | 'Evening' | '';
type SurfaceOption = 'Road' | 'Trail' | 'Park' | '';
type GoalOption = 'Fitness' | 'Social' | 'Training' | '';
type LevelOption = 'Beginner' | 'Intermediate' | 'Advanced' | '';

type OptionButtonProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function OptionButton({ label, active, onPress }: OptionButtonProps) {
  return (
    <Pressable
      style={[styles.optionButton, active && styles.optionButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.optionText, active && styles.optionTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function formatNumericOnly(value: string, maxLength = 3) {
  return value.replace(/[^0-9]/g, '').slice(0, maxLength);
}

function formatPaceInput(value: string) {
  const cleaned = value.replace(/[^0-9:]/g, '');

  if (cleaned.includes(':')) {
    const parts = cleaned.split(':');
    const minutes = (parts[0] || '').replace(/[^0-9]/g, '').slice(0, 2);
    const seconds = (parts[1] || '').replace(/[^0-9]/g, '').slice(0, 2);
    return seconds.length > 0 ? `${minutes}:${seconds}` : `${minutes}:`;
  }

  const digits = cleaned.replace(/[^0-9]/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function isValidPace(pace: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(pace);
  if (!match) return false;

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);

  if (minutes < 1 || minutes > 59) return false;
  if (seconds < 0 || seconds > 59) return false;

  return true;
}

export default function EditProfileScreen() {
  const currentUser = auth.currentUser;
  const scrollRef = useRef<ScrollView>(null);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [city, setCity] = useState('');
  const [pace, setPace] = useState('');
  const [distance, setDistance] = useState('');
  const [runType, setRunType] = useState<RunTypeOption>('');
  const [sex, setSex] = useState<SexOption>('');

  const [runWithDog, setRunWithDog] = useState<YesNoOption>('');
  const [runWithMusic, setRunWithMusic] = useState<YesNoOption>('');
  const [talkDuringRun, setTalkDuringRun] = useState<YesNoOption>('');
  const [adaptPace, setAdaptPace] = useState<YesNoOption>('');
  const [preferredTime, setPreferredTime] = useState<PreferredTimeOption>('');
  const [surface, setSurface] = useState<SurfaceOption>('');
  const [goal, setGoal] = useState<GoalOption>('');
  const [level, setLevel] = useState<LevelOption>('');

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const scrollToPosition = (y: number) => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y, animated: true });
    }, 180);
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        if (!currentUser?.uid) {
          setLoading(false);
          return;
        }

        const doc = await db.collection('users').doc(currentUser.uid).get();
        const data = (doc.data() as any) || {};

        setName(data?.name || '');
        setAge(data?.age ? String(data.age) : '');
        setCity(data?.city || '');
        setPace(data?.pace || '');
        setDistance(data?.distance || '');
        setRunType(data?.runType || '');
        setSex(data?.sex || '');

        setRunWithDog(data?.runWithDog || '');
        setRunWithMusic(data?.runWithMusic || '');
        setTalkDuringRun(data?.talkDuringRun || '');
        setAdaptPace(data?.adaptPace || '');
        setPreferredTime(data?.preferredTime || '');
        setSurface(data?.surface || '');
        setGoal(data?.goal || '');
        setLevel(data?.level || '');
      } catch (error: any) {
        Alert.alert('Error', error?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [currentUser?.uid]);

  const handleSave = async () => {
    try {
      if (!currentUser?.uid) {
        Alert.alert('Error', 'No logged in user');
        return;
      }

      if (
        !name.trim() ||
        !age.trim() ||
        !city.trim() ||
        !pace.trim() ||
        !distance.trim() ||
        !runType ||
        !sex ||
        !runWithDog ||
        !runWithMusic ||
        !talkDuringRun ||
        !adaptPace ||
        !preferredTime ||
        !surface ||
        !goal ||
        !level
      ) {
        Alert.alert('Error', 'Please fill all fields');
        return;
      }

      const ageNumber = Number(age);
      const distanceNumber = Number(distance);

      if (!ageNumber || ageNumber < 10 || ageNumber > 99) {
        Alert.alert('Error', 'Age must be between 10 and 99');
        return;
      }

      if (!distanceNumber || distanceNumber < 1 || distanceNumber > 999) {
        Alert.alert('Error', 'Distance must be between 1 and 999 KM');
        return;
      }

      if (!isValidPace(pace.trim())) {
        Alert.alert('Error', 'Pace must be like 5:20 or 12:45');
        return;
      }

      setSaving(true);

      await db.collection('users').doc(currentUser.uid).set(
        {
          name: name.trim(),
          age: ageNumber,
          city: city.trim(),
          pace: pace.trim(),
          distance: distance.trim(),
          runType,
          sex,
          runWithDog,
          runWithMusic,
          talkDuringRun,
          adaptPace,
          preferredTime,
          surface,
          goal,
          level,
          profileComplete: true,
        },
        { merge: true }
      );

      Alert.alert('Success', 'Profile updated');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.replace('/login');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Logout failed');
    }
  };

  if (loading) {
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
        <SafeAreaView style={styles.loadingSafeArea} edges={['top', 'bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>{i18n.t('loadingProfile')}</Text>
          </View>
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
                <Ionicons name="chevron-back" size={22} color="#1C2440" />
              </Pressable>

              <View style={styles.titleWrap}>
                <Text style={styles.titleText}>{i18n.t('editProfile')}</Text>
              </View>

              <View style={styles.headerSpacer} />
            </View>

            <View style={styles.formCard}>
              <Text style={styles.sectionHeader}>Basic Info</Text>

              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor="#7A859E"
              />

              <Text style={styles.label}>{i18n.t('age')}</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={(value) => setAge(formatNumericOnly(value, 2))}
                placeholder="25"
                placeholderTextColor="#7A859E"
                keyboardType="number-pad"
                maxLength={2}
              />

              <Text style={styles.label}>{i18n.t('city')}</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="Prague"
                placeholderTextColor="#7A859E"
              />

              <Text style={styles.label}>{i18n.t('distance')}</Text>
              <View style={styles.inputWithSuffix}>
                <TextInput
                  style={styles.inputWithSuffixField}
                  value={distance}
                  onChangeText={(value) => setDistance(formatNumericOnly(value, 3))}
                  placeholder="20"
                  placeholderTextColor="#7A859E"
                  keyboardType="number-pad"
                  maxLength={3}
                  onFocus={() => scrollToPosition(120)}
                />
                <Text style={styles.suffixText}>KM</Text>
              </View>

              <Text style={styles.label}>{i18n.t('pace')}</Text>
              <View style={styles.inputWithSuffix}>
                <TextInput
                  style={styles.inputWithSuffixField}
                  value={pace}
                  onChangeText={(value) => setPace(formatPaceInput(value))}
                  placeholder="5:20"
                  placeholderTextColor="#7A859E"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  onFocus={() => scrollToPosition(170)}
                />
                <Text style={styles.suffixText}>min/km</Text>
              </View>

              <Text style={styles.label}>{i18n.t('runType')}</Text>
              <View style={styles.optionsRow}>
                <OptionButton
                  label={i18n.t('road')}
                  active={runType === 'Road'}
                  onPress={() => setRunType('Road')}
                />
                <OptionButton
                  label={i18n.t('trail')}
                  active={runType === 'Trail'}
                  onPress={() => setRunType('Trail')}
                />
              </View>

              <Text style={styles.label}>{i18n.t('sex')}</Text>
              <View style={styles.optionsRow}>
                <OptionButton
                  label={i18n.t('male')}
                  active={sex === 'Male'}
                  onPress={() => setSex('Male')}
                />
                <OptionButton
                  label={i18n.t('female')}
                  active={sex === 'Female'}
                  onPress={() => setSex('Female')}
                />
              </View>

              <Text style={styles.sectionHeader}>Running Style</Text>

              <Text style={styles.label}>Run with dog</Text>
              <View style={styles.optionsRow}>
                <OptionButton
                  label="Yes"
                  active={runWithDog === 'Yes'}
                  onPress={() => setRunWithDog('Yes')}
                />
                <OptionButton
                  label="No"
                  active={runWithDog === 'No'}
                  onPress={() => setRunWithDog('No')}
                />
              </View>

              <Text style={styles.label}>Run with music</Text>
              <View style={styles.optionsRow}>
                <OptionButton
                  label="Yes"
                  active={runWithMusic === 'Yes'}
                  onPress={() => setRunWithMusic('Yes')}
                />
                <OptionButton
                  label="No"
                  active={runWithMusic === 'No'}
                  onPress={() => setRunWithMusic('No')}
                />
              </View>

              <Text style={styles.label}>Talking during run</Text>
              <View style={styles.optionsRow}>
                <OptionButton
                  label="Yes"
                  active={talkDuringRun === 'Yes'}
                  onPress={() => setTalkDuringRun('Yes')}
                />
                <OptionButton
                  label="No"
                  active={talkDuringRun === 'No'}
                  onPress={() => setTalkDuringRun('No')}
                />
              </View>

              <Text style={styles.label}>Can adapt pace</Text>
              <View style={styles.optionsRow}>
                <OptionButton
                  label="Yes"
                  active={adaptPace === 'Yes'}
                  onPress={() => setAdaptPace('Yes')}
                />
                <OptionButton
                  label="No"
                  active={adaptPace === 'No'}
                  onPress={() => setAdaptPace('No')}
                />
              </View>

              <Text style={styles.sectionHeader}>Preferences</Text>

              <Text style={styles.label}>Preferred time</Text>
              <View style={styles.optionsRow}>
                <OptionButton
                  label="Morning"
                  active={preferredTime === 'Morning'}
                  onPress={() => setPreferredTime('Morning')}
                />
                <OptionButton
                  label="Evening"
                  active={preferredTime === 'Evening'}
                  onPress={() => setPreferredTime('Evening')}
                />
              </View>

              <Text style={styles.label}>Preferred surface</Text>
              <View style={styles.optionGrid}>
                <View style={styles.optionGridItem}>
                  <OptionButton
                    label="Road"
                    active={surface === 'Road'}
                    onPress={() => setSurface('Road')}
                  />
                </View>
                <View style={styles.optionGridItem}>
                  <OptionButton
                    label="Trail"
                    active={surface === 'Trail'}
                    onPress={() => setSurface('Trail')}
                  />
                </View>
                <View style={styles.optionGridItem}>
                  <OptionButton
                    label="Park"
                    active={surface === 'Park'}
                    onPress={() => setSurface('Park')}
                  />
                </View>
              </View>

              <Text style={styles.sectionHeader}>Goals</Text>

              <Text style={styles.label}>Goal</Text>
              <View style={styles.optionGrid}>
                <View style={styles.optionGridItem}>
                  <OptionButton
                    label="Fitness"
                    active={goal === 'Fitness'}
                    onPress={() => setGoal('Fitness')}
                  />
                </View>
                <View style={styles.optionGridItem}>
                  <OptionButton
                    label="Social"
                    active={goal === 'Social'}
                    onPress={() => setGoal('Social')}
                  />
                </View>
                <View style={styles.optionGridItem}>
                  <OptionButton
                    label="Training"
                    active={goal === 'Training'}
                    onPress={() => setGoal('Training')}
                  />
                </View>
              </View>

              <Text style={styles.label}>Level</Text>
              <View style={styles.optionGrid}>
                <View style={styles.optionGridItem}>
                  <OptionButton
                    label="Beginner"
                    active={level === 'Beginner'}
                    onPress={() => setLevel('Beginner')}
                  />
                </View>
                <View style={styles.optionGridItem}>
                  <OptionButton
                    label="Intermediate"
                    active={level === 'Intermediate'}
                    onPress={() => setLevel('Intermediate')}
                  />
                </View>
                <View style={styles.optionGridItem}>
                  <OptionButton
                    label="Advanced"
                    active={level === 'Advanced'}
                    onPress={() => setLevel('Advanced')}
                  />
                </View>
              </View>

              <Pressable
                style={[styles.saveButtonShell, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <LinearGradient
                  colors={['#16B57F', '#31CB8E', '#65E0A3']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveButton}
                >
                  <Ionicons name="save-outline" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>
                    {saving ? i18n.t('loading') : i18n.t('saveProfile')}
                  </Text>
                </LinearGradient>
              </Pressable>

              <Pressable style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={18} color="#FF3B3B" />
                <Text style={styles.logoutText}>{i18n.t('logout')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  },

  keyboardWrap: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  container: {
    paddingTop: 16,
    paddingBottom: 40,
    paddingHorizontal: 18,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  backButton: {
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

  titleWrap: {
    flex: 1,
    marginHorizontal: 12,
    backgroundColor: '#F7F8FC',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 18,
    shadowColor: '#032A7A',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },

  titleText: {
    color: '#1C2440',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },

  headerSpacer: {
    width: 52,
    height: 52,
  },

  formCard: {
    backgroundColor: '#F7F8FC',
    borderRadius: 32,
    padding: 20,
    shadowColor: '#032A7A',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
  },

  sectionHeader: {
    color: '#16244A',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 8,
    marginBottom: 10,
  },

  label: {
    color: '#24345C',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 12,
  },

  input: {
    backgroundColor: '#EEF3FF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },

  inputWithSuffix: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF3FF',
    borderRadius: 18,
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

  optionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 2,
  },

  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },

  optionGridItem: {
    width: '50%',
    paddingHorizontal: 4,
    marginBottom: 8,
  },

  optionButton: {
    minHeight: 52,
    backgroundColor: '#EEF3FF',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

  optionButtonActive: {
    backgroundColor: '#1B67E8',
  },

  optionText: {
    color: '#1C2440',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },

  optionTextActive: {
    color: '#FFFFFF',
  },

  saveButtonShell: {
    marginTop: 22,
  },

  saveButton: {
    minHeight: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#25BF88',
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },

  saveButtonDisabled: {
    opacity: 0.7,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 8,
  },

  logoutButton: {
    marginTop: 14,
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#FF3B3B',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },

  logoutText: {
    color: '#FF3B3B',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 6,
  },
});