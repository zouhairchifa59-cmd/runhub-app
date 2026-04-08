import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type WpRendered = {
  rendered?: string;
};

type WpPost = {
  id: number;
  date?: string;
  link?: string;
  title?: WpRendered;
  excerpt?: WpRendered;
  _embedded?: {
    ['wp:featuredmedia']?: {
      source_url?: string;
    }[];
    ['wp:term']?: {
      name?: string;
    }[][];
  };
};

type NewsCardItem = {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  link: string;
  image: string;
  category: string;
};

const WORDPRESS_POSTS_URL =
  'https://www.runhub.cz/wp-json/wp/v2/posts?_embed&per_page=20';

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
}

function formatDate(dateString?: string) {
  if (!dateString) return 'Recent';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Recent';

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function NewsScreen() {
  const [articles, setArticles] = useState<NewsCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadArticles = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(WORDPRESS_POSTS_URL, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const posts: WpPost[] = await response.json();

      const mapped: NewsCardItem[] = posts.map((post, index) => {
        const image =
          post?._embedded?.['wp:featuredmedia']?.[0]?.source_url || '';

        const category =
          index === 0
            ? 'Last article'
            : post?._embedded?.['wp:term']?.[0]?.[0]?.name || 'News';

        return {
          id: String(post.id),
          title: stripHtml(post?.title?.rendered || 'Untitled article'),
          excerpt: stripHtml(post?.excerpt?.rendered || ''),
          date: formatDate(post?.date),
          link: post?.link || 'https://www.runhub.cz',
          image,
          category,
        };
      });

      setArticles(mapped);
    } catch (error: any) {
      setArticles([]);
      Alert.alert('Error', error?.message || 'Failed to load articles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadArticles();
  }, []);

  const openArticle = (item: NewsCardItem) => {
    router.push({
      pathname: '/news-details',
      params: {
        postId: item.id,
        title: item.title,
      },
    });
  };

  const renderItem = ({ item, index }: { item: NewsCardItem; index: number }) => {
    return (
      <Pressable style={styles.card} onPress={() => openArticle(item)}>
        <View style={styles.imageWrap}>
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="newspaper-outline" size={40} color="#1A2A55" />
            </View>
          )}

          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {index === 0 ? 'Last article' : item.category}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.title} numberOfLines={3}>
            {item.title}
          </Text>

          {!!item.excerpt && (
            <Text style={styles.excerpt} numberOfLines={3}>
              {item.excerpt}
            </Text>
          )}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={20} color="#70798E" />
              <Text style={styles.metaText}>{item.date}</Text>
            </View>

            <View style={styles.openWrap}>
              <Text style={styles.openText}>Open</Text>
              <Ionicons name="arrow-forward" size={24} color="#FF4B43" />
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#F3F3F6"
          translucent={false}
        />

        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.loadingContainer}>
            <View style={styles.heroCard}>
              <Text style={styles.heroTitle}>Sports news from RunHub</Text>
              <Text style={styles.heroText}>
                Latest articles and updates from your WordPress site.
              </Text>
            </View>

            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#FF4B43" />
              <Text style={styles.loadingText}>Loading articles...</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F3F3F6"
        translucent={false}
      />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadArticles(true)}
              tintColor="#111827"
            />
          }
          ListHeaderComponent={
            <View style={styles.heroCard}>
              <Text style={styles.heroTitle}>Sports news from RunHub</Text>
              <Text style={styles.heroText}>
                Latest articles and updates from your WordPress site.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No articles found</Text>
              <Text style={styles.emptyText}>
                No published posts were found.
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F3F6',
  },

  safeArea: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: '#F3F3F6',
  },

  content: {
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 36,
  },

  heroCard: {
    backgroundColor: '#FAFAFC',
    borderRadius: 34,
    paddingHorizontal: 22,
    paddingVertical: 24,
    marginBottom: 18,
    shadowColor: '#B8C0D4',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },

  heroTitle: {
    color: '#1A1D34',
    fontSize: 31,
    fontWeight: '900',
    lineHeight: 40,
    marginBottom: 10,
  },

  heroText: {
    color: '#5B6175',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },

  card: {
    backgroundColor: '#FAFAFC',
    borderRadius: 34,
    overflow: 'hidden',
    marginBottom: 22,
    shadowColor: '#B8C0D4',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },

  imageWrap: {
    position: 'relative',
    width: '100%',
    height: 300,
    backgroundColor: '#DCE7FF',
  },

  image: {
    width: '100%',
    height: '100%',
  },

  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  categoryBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#101938',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },

  categoryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  cardContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
  },

  title: {
    color: '#1A1D34',
    fontSize: 27,
    fontWeight: '900',
    lineHeight: 38,
    marginBottom: 12,
  },

  excerpt: {
    color: '#5E667B',
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '600',
    marginBottom: 18,
  },

  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  metaText: {
    color: '#70798E',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },

  openWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  openText: {
    color: '#FF4B43',
    fontSize: 16,
    fontWeight: '900',
    marginRight: 8,
  },

  emptyCard: {
    backgroundColor: '#FAFAFC',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#B8C0D4',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  emptyTitle: {
    color: '#1A1D34',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },

  emptyText: {
    color: '#5E667B',
    fontSize: 15,
    lineHeight: 22,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#F3F3F6',
    paddingTop: 16,
    paddingHorizontal: 18,
  },

  loadingCard: {
    backgroundColor: '#FAFAFC',
    borderRadius: 30,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#B8C0D4',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  loadingText: {
    marginTop: 12,
    color: '#5E667B',
    fontSize: 15,
    fontWeight: '700',
  },
});
