import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { auth, db } from '../constants/firebase';

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

export default function OnboardingScreen() {
  const currentUser = auth.currentUser;

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [city, setCity] = useState('');
  const [distance, setDistance] = useState('');
  const [pace, setPace] = useState('');
  const [bio, setBio] = useState('');
  const [runType, setRunType] = useState<'Road' | 'Trail' | ''>('');
  const [sex, setSex] = useState<'Male' | 'Female' | ''>('');
  const [saving, setSaving] = useState(false);

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
        !distance.trim() ||
        !pace.trim() ||
        !bio.trim() ||
        !runType ||
        !sex
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
          distance: distance.trim(),
          pace: pace.trim(),
          bio: bio.trim(),
          runType,
          sex,
          email: currentUser.email || '',
          profileComplete: true,
        },
        { merge: true }
      );

      router.replace('/(tabs)/explore');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Complete your profile</Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="#6b7280"
          />

          <Text style={styles.label}>Age</Text>
          <TextInput
            style={styles.input}
            value={age}
            onChangeText={(value) => setAge(formatNumericOnly(value, 2))}
            placeholder="25"
            placeholderTextColor="#6b7280"
            keyboardType="number-pad"
            maxLength={2}
          />

          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="Your city"
            placeholderTextColor="#6b7280"
          />

          <Text style={styles.label}>Distance</Text>
          <View style={styles.inputWithSuffix}>
            <TextInput
              style={styles.inputWithSuffixField}
              value={distance}
              onChangeText={(value) => setDistance(formatNumericOnly(value, 3))}
              placeholder="20"
              placeholderTextColor="#6b7280"
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={styles.suffixText}>KM</Text>
          </View>

          <Text style={styles.label}>Pace</Text>
          <View style={styles.inputWithSuffix}>
            <TextInput
              style={styles.inputWithSuffixField}
              value={pace}
              onChangeText={(value) => setPace(formatPaceInput(value))}
              placeholder="5:20"
              placeholderTextColor="#6b7280"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
            <Text style={styles.suffixText}>min/km</Text>
          </View>

          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell something about yourself"
            placeholderTextColor="#6b7280"
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.label}>Run Type</Text>
          <View style={styles.optionsRow}>
            <OptionButton
              label="Road"
              active={runType === 'Road'}
              onPress={() => setRunType('Road')}
            />
            <OptionButton
              label="Trail"
              active={runType === 'Trail'}
              onPress={() => setRunType('Trail')}
            />
          </View>

          <Text style={styles.label}>Sex</Text>
          <View style={styles.optionsRow}>
            <OptionButton
              label="Male"
              active={sex === 'Male'}
              onPress={() => setSex('Male')}
            />
            <OptionButton
              label="Female"
              active={sex === 'Female'}
              onPress={() => setSex('Female')}
            />
          </View>

          <Pressable
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Profile'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0b4cb3',
  },
  container: {
    paddingTop: 40,
    paddingBottom: 120,
    paddingHorizontal: 22,
  },
  title: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 18,
  },
  formCard: {
    backgroundColor: '#f7f7f7',
    borderRadius: 28,
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
  bioInput: {
    minHeight: 120,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  optionButton: {
    flex: 1,
    backgroundColor: '#eef2ff',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionButtonActive: {
    backgroundColor: '#ff3b3b',
  },
  optionText: {
    color: '#1c1b2b',
    fontSize: 15,
    fontWeight: '800',
  },
  optionTextActive: {
    color: '#ffffff',
  },
  saveButton: {
    backgroundColor: '#ff3b3b',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 22,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
});