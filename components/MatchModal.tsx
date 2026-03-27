import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import i18n from '../translations';
import { getProfileImage } from '../utils/avatar';

const { width, height } = Dimensions.get('window');
const SHAPE_SIZE = width * 0.68;

type MatchUser = {
  name?: string;
  photoURL?: string;
  sex?: string;
};

type Props = {
  visible: boolean;
  currentUser: MatchUser;
  matchedUser: MatchUser;
  messageText: string;
  onChangeMessage: (text: string) => void;
  onClose: () => void;
  onSendMessage: () => void;
};

export default function MatchModal({
  visible,
  currentUser,
  matchedUser,
  messageText,
  onChangeMessage,
  onClose,
  onSendMessage,
}: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.88)).current;
  const leftAvatarX = useRef(new Animated.Value(-70)).current;
  const rightAvatarX = useRef(new Animated.Value(70)).current;
  const titleY = useRef(new Animated.Value(30)).current;
  const titleScale = useRef(new Animated.Value(0.85)).current;
  const shapePulse = useRef(new Animated.Value(0.9)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!visible) return;

    fadeAnim.setValue(0);
    contentScale.setValue(0.88);
    leftAvatarX.setValue(-70);
    rightAvatarX.setValue(70);
    titleY.setValue(30);
    titleScale.setValue(0.85);
    shapePulse.setValue(0.9);
    glowOpacity.setValue(0.3);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.spring(contentScale, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.spring(leftAvatarX, {
        toValue: 0,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.spring(rightAvatarX, {
        toValue: 0,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.spring(titleY, {
        toValue: 0,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.spring(titleScale, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(shapePulse, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.55,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(shapePulse, {
            toValue: 0.93,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.28,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [
    visible,
    fadeAnim,
    contentScale,
    leftAvatarX,
    rightAvatarX,
    titleY,
    titleScale,
    shapePulse,
    glowOpacity,
  ]);

  const currentUserImage = getProfileImage(currentUser?.photoURL, currentUser?.sex);
  const matchedUserImage = getProfileImage(matchedUser?.photoURL, matchedUser?.sex);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={['#30d158', '#16b84b', '#0d9f3c', '#08722a', '#064f1d']}
          style={StyleSheet.absoluteFillObject}
        />

        <Animated.View
          style={[
            styles.glowCircle,
            {
              opacity: glowOpacity,
              transform: [{ scale: shapePulse }],
            },
          ]}
        />

        <Pressable style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={30} color="#fff" />
        </Pressable>

        <Animated.View
          style={[
            styles.content,
            {
              transform: [{ scale: contentScale }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.shapeArea,
              {
                transform: [{ scale: shapePulse }],
              },
            ]}
          >
            <View style={[styles.shapeLayer, styles.shapeBack]} />
            <View style={[styles.shapeLayer, styles.shapeMiddle]} />
            <View style={[styles.shapeLayer, styles.shapeFront]} />
          </Animated.View>

          <View style={styles.sparkleBig} />
          <View style={styles.sparkleMedium} />
          <View style={styles.sparkleSmall} />

          <View style={styles.avatarsRow}>
            <Animated.View
              style={[
                styles.avatarWrap,
                {
                  transform: [{ translateX: leftAvatarX }],
                },
              ]}
            >
              <Image source={{ uri: currentUserImage }} style={styles.avatarImage} />
            </Animated.View>

            <Animated.View
              style={[
                styles.avatarWrap,
                styles.avatarWrapRight,
                {
                  transform: [{ translateX: rightAvatarX }],
                },
              ]}
            >
              <Image source={{ uri: matchedUserImage }} style={styles.avatarImage} />
            </Animated.View>
          </View>

          <Animated.View
            style={[
              styles.titleBlock,
              {
                opacity: fadeAnim,
                transform: [{ translateY: titleY }, { scale: titleScale }],
              },
            ]}
          >
            <Text style={styles.smallTitle}>LET&apos;S</Text>
            <Text style={styles.bigTitle}>RUN</Text>
            <Text style={styles.subtitle}>
              {i18n.t('youMatchedWith')} {matchedUser?.name || i18n.t('runner')}
            </Text>
          </Animated.View>

          <View style={styles.messageBox}>
            <TextInput
              value={messageText}
              onChangeText={onChangeMessage}
              placeholder={i18n.t('saySomethingNice')}
              placeholderTextColor="#6b7280"
              style={styles.input}
              maxLength={180}
            />
            <Pressable style={styles.sendButtonInline} onPress={onSendMessage}>
              <Text style={styles.sendButtonInlineText}>{i18n.t('send')}</Text>
            </Pressable>
          </View>

          <View style={styles.quickRepliesRow}>
            <Pressable
              style={styles.quickReplyButton}
              onPress={() => onChangeMessage('🏃 Let’s run soon!')}
            >
              <Text style={styles.quickReplyText}>🏃</Text>
            </Pressable>

            <Pressable
              style={styles.quickReplyButton}
              onPress={() => onChangeMessage('🔥 Great pace!')}
            >
              <Text style={styles.quickReplyText}>🔥</Text>
            </Pressable>

            <Pressable
              style={styles.quickReplyButton}
              onPress={() => onChangeMessage('👟 Ready for a run?')}
            >
              <Text style={styles.quickReplyText}>👟</Text>
            </Pressable>

            <Pressable
              style={styles.quickReplyButton}
              onPress={() => onChangeMessage('💨 Let’s train together!')}
            >
              <Text style={styles.quickReplyText}>💨</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 20,
  },
  glowCircle: {
    position: 'absolute',
    top: height * 0.18,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(163,255,116,0.22)',
  },
  closeButton: {
    position: 'absolute',
    top: 58,
    left: 18,
    zIndex: 30,
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 20,
  },
  shapeArea: {
    width: SHAPE_SIZE,
    height: SHAPE_SIZE * 0.78,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 42,
    marginBottom: 16,
  },
  shapeLayer: {
    position: 'absolute',
    width: SHAPE_SIZE,
    height: SHAPE_SIZE * 0.72,
    borderRadius: 52,
    transform: [{ rotate: '-45deg' }],
  },
  shapeBack: {
    backgroundColor: 'rgba(138,255,111,0.20)',
    transform: [{ scale: 1.18 }, { rotate: '-45deg' }],
  },
  shapeMiddle: {
    backgroundColor: 'rgba(120,245,93,0.28)',
    transform: [{ scale: 0.98 }, { rotate: '-45deg' }],
  },
  shapeFront: {
    backgroundColor: 'rgba(101,233,72,0.42)',
    transform: [{ scale: 0.8 }, { rotate: '-45deg' }],
  },
  sparkleBig: {
    position: 'absolute',
    top: 170,
    right: 74,
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    transform: [{ rotate: '45deg' }],
  },
  sparkleMedium: {
    position: 'absolute',
    top: 195,
    right: 126,
    width: 9,
    height: 9,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.9)',
    transform: [{ rotate: '45deg' }],
  },
  sparkleSmall: {
    position: 'absolute',
    top: 220,
    right: 90,
    width: 6,
    height: 6,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.85)',
    transform: [{ rotate: '45deg' }],
  },
  avatarsRow: {
    position: 'absolute',
    top: 220,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: '#fff',
    padding: 6,
    borderWidth: 3,
    borderColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  avatarWrapRight: {
    marginLeft: -18,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  titleBlock: {
    alignItems: 'center',
    marginTop: 100,
    marginBottom: 28,
  },
  smallTitle: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.24)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  bigTitle: {
    color: '#ffffff',
    fontSize: 92,
    lineHeight: 96,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 10,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.97)',
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
  },
  messageBox: {
    width: '100%',
    minHeight: 68,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 8,
    marginBottom: 26,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  input: {
    flex: 1,
    color: '#111827',
    fontSize: 17,
    fontWeight: '600',
    paddingVertical: 16,
  },
  sendButtonInline: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sendButtonInlineText: {
    color: '#6b7280',
    fontSize: 17,
    fontWeight: '900',
  },
  quickRepliesRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickReplyButton: {
    width: '23%',
    height: 66,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.42)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  quickReplyText: {
    fontSize: 30,
  },
});