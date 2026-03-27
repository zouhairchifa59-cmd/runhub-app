import { StyleSheet, Text, View } from 'react-native';

type AppScreenTitleProps = {
  title: string;
};

export default function AppScreenTitle({ title }: AppScreenTitleProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    backgroundColor: '#f7f7f7',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 18,
  },
  title: {
    color: '#1c1b2b',
    fontSize: 24,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 1.4,
  },
});