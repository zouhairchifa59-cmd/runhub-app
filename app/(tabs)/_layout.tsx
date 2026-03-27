import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type TabIconProps = {
  focused: boolean;
  name: keyof typeof Ionicons.glyphMap;
  label: string;
};

function TabIcon({ focused, name, label }: TabIconProps) {
  const scale = useRef(new Animated.Value(focused ? 1.06 : 1)).current;
  const opacity = useRef(new Animated.Value(focused ? 1 : 0.72)).current;
  const translateY = useRef(new Animated.Value(focused ? -1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1.06 : 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: focused ? 1 : 0.72,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: focused ? -1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused, scale, opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.iconWrap,
        {
          opacity,
          transform: [{ scale }, { translateY }],
        },
      ]}
    >
      <Ionicons
        name={name}
        size={25}
        color={focused ? '#6C748D' : '#98A0B8'}
      />
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? '#6C748D' : '#98A0B8' },
        ]}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

function CenterExploreButton({ focused }: { focused: boolean }) {
  const scale = useRef(new Animated.Value(focused ? 1.08 : 1)).current;
  const translateY = useRef(new Animated.Value(-14)).current;
  const ringScale = useRef(new Animated.Value(focused ? 1.08 : 1)).current;
  const glowOpacity = useRef(new Animated.Value(focused ? 1 : 0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1.08 : 1,
        friction: 5,
        tension: 140,
        useNativeDriver: true,
      }),
      Animated.spring(ringScale, {
        toValue: focused ? 1.08 : 1,
        friction: 6,
        tension: 130,
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: focused ? 1 : 0.92,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused, scale, ringScale, glowOpacity]);

  return (
    <View style={styles.centerWrap}>
      <Animated.View
        style={[
          styles.centerButtonOuter,
          {
            opacity: glowOpacity,
            transform: [{ scale: ringScale }, { translateY }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.centerButtonInnerWrap,
            {
              transform: [{ scale }],
            },
          ]}
        >
          <LinearGradient
            colors={['#2BCB87', '#55D99B', '#79E2AF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.centerButtonInner}
          >
            <Ionicons name="walk" size={30} color="#fff" />
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="home" label="Home" />
          ),
        }}
      />

      <Tabs.Screen
        name="news"
        options={{
          title: 'Feed',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="grid" label="Feed" />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ focused }) => (
            <CenterExploreButton focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="chatbubble" label="Chat" />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="person" label="Profile" />
          ),
        }}
      />

      <Tabs.Screen
        name="matches"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    height: Platform.OS === 'ios' ? 92 : 82,
    borderRadius: 34,
    backgroundColor: '#F8F9FD',
    borderTopWidth: 0,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    elevation: 14,
    shadowColor: '#7B8FC7',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },

  tabBarItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  iconWrap: {
    width: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
  },

  tabLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
  },

  centerWrap: {
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },

  centerButtonOuter: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#EEF2F8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7FA8C2',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },

  centerButtonInnerWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
  },

  centerButtonInner: {
    flex: 1,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#32C98A',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});