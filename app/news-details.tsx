import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { WebView } from 'react-native-webview';

type WpRendered = {
  rendered?: string;
};

type WpPostDetails = {
  id: number;
  date?: string;
  link?: string;
  title?: WpRendered;
  content?: WpRendered;
  _embedded?: {
    ['wp:featuredmedia']?: {
      source_url?: string;
    }[];
    ['wp:term']?: {
      name?: string;
    }[][];
  };
};

type ArticleDetails = {
  title: string;
  date: string;
  image: string;
  category: string;
  content: string;
  link: string;
};

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

function buildHtmlDocument(content: string) {
  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #1c1b2b;
            font-size: 16px;
            line-height: 1.8;
            padding: 0;
            margin: 0;
            background: #ffffff;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          * {
            max-width: 100% !important;
            box-sizing: border-box;
          }
          img {
            max-width: 100% !important;
            height: auto !important;
            border-radius: 14px;
            display: block;
            margin: 14px 0;
          }
          figure {
            margin: 0 0 18px 0;
          }
          p {
            margin: 0 0 16px 0;
          }
          h1, h2, h3, h4, h5, h6 {
            color: #111827;
            line-height: 1.35;
            margin-top: 20px;
            margin-bottom: 12px;
          }
          ul, ol {
            margin: 0 0 16px 18px;
            padding: 0;
          }
          li {
            margin-bottom: 8px;
          }
          a {
            color: #0b57d0;
            text-decoration: none;
          }
          blockquote {
            margin: 16px 0;
            padding: 12px 14px;
            background: #f8fafc;
            border-left: 4px solid #ff3b3b;
            border-radius: 10px;
          }
          iframe {
            max-width: 100% !important;
          }
        </style>
      </head>
      <body>
        ${content}
        <script>
          function sendHeight() {
            const body = document.body;
            const html = document.documentElement;
            const height = Math.max(
              body.scrollHeight,
              body.offsetHeight,
              html.clientHeight,
              html.scrollHeight,
              html.offsetHeight
            );
            window.ReactNativeWebView.postMessage(String(height));
          }

          window.addEventListener('load', function() {
            setTimeout(sendHeight, 300);
            setTimeout(sendHeight, 800);
          });

          window.addEventListener('resize', sendHeight);

          const images = document.images;
          for (let i = 0; i < images.length; i++) {
            images[i].addEventListener('load', sendHeight);
          }

          setTimeout(sendHeight, 1200);
        </script>
      </body>
    </html>
  `;
}

export default function NewsDetailsScreen() {
  const { postId } = useLocalSearchParams<{ postId?: string }>();

  const [article, setArticle] = useState<ArticleDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [webHeight, setWebHeight] = useState(900);

  const htmlSource = useMemo(() => {
    return article ? buildHtmlDocument(article.content) : '';
  }, [article]);

  const loadArticle = useCallback(async () => {
    try {
      if (!postId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const response = await fetch(
        `https://www.runhub.cz/wp-json/wp/v2/posts/${postId}?_embed`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const post: WpPostDetails = await response.json();

      const image =
        post?._embedded?.['wp:featuredmedia']?.[0]?.source_url || '';

      const category =
        post?._embedded?.['wp:term']?.[0]?.[0]?.name || 'News';

      setArticle({
        title: post?.title?.rendered || 'Untitled article',
        date: formatDate(post?.date),
        image,
        category,
        content: post?.content?.rendered || '<p>No content found.</p>',
        link: post?.link || 'https://www.runhub.cz',
      });
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load article');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadArticle();
  }, [loadArticle]);

  const handleShare = async () => {
    try {
      if (!article?.link) return;

      await Share.share({
        message: `${article.title}\n${article.link}`,
        url: article.link,
        title: article.title,
      });
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to share article');
    }
  };

  const handleOpenBrowser = async () => {
    try {
      if (!article?.link) return;

      const supported = await Linking.canOpenURL(article.link);

      if (!supported) {
        Alert.alert('Error', 'Cannot open this article');
        return;
      }

      await Linking.openURL(article.link);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to open article');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Loading article...</Text>
      </View>
    );
  }

  if (!article) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Article not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topHeader}>
          <Pressable onPress={() => router.back()} style={styles.backCircle}>
            <Ionicons name="chevron-back" size={22} color="#1c1b2b" />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              ARTICLE
            </Text>
          </View>

          <Pressable onPress={handleShare} style={styles.shareCircle}>
            <Ionicons name="share-social-outline" size={20} color="#1c1b2b" />
          </Pressable>
        </View>

        <View style={styles.articleCard}>
          {!!article.image && (
            <Image source={{ uri: article.image }} style={styles.heroImage} />
          )}

          <View style={styles.topMetaRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{article.category}</Text>
            </View>

            <Pressable style={styles.browserButton} onPress={handleOpenBrowser}>
              <Ionicons name="open-outline" size={14} color="#ff3b3b" />
              <Text style={styles.browserButtonText}>Open</Text>
            </Pressable>
          </View>

          <Text style={styles.title}>{article.title}</Text>

          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={14} color="#64748B" />
            <Text style={styles.metaText}>{article.date}</Text>
          </View>

          <View style={styles.contentCard}>
            <WebView
              originWhitelist={['*']}
              source={{ html: htmlSource }}
              style={[styles.webview, { height: webHeight }]}
              scrollEnabled={false}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              onMessage={(event) => {
                const nextHeight = Number(event.nativeEvent.data);
                if (!Number.isNaN(nextHeight) && nextHeight > 200) {
                  setWebHeight(nextHeight);
                }
              }}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b4cb3',
  },
  content: {
    paddingTop: 40,
    paddingHorizontal: 22,
    paddingBottom: 120,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#f7f7f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
    backgroundColor: '#f7f7f7',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  headerTitle: {
    color: '#1c1b2b',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    fontStyle: 'italic',
    letterSpacing: 1.2,
  },
  shareCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#f7f7f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  articleCard: {
    backgroundColor: '#f7f7f7',
    borderRadius: 32,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  heroImage: {
    width: '100%',
    height: 230,
    borderRadius: 24,
    marginBottom: 14,
  },
  topMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  categoryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  browserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f1',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  browserButtonText: {
    color: '#ff3b3b',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 4,
  },
  title: {
    color: '#1c1b2b',
    fontSize: 29,
    fontWeight: '900',
    lineHeight: 38,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  metaText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 6,
  },
  contentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 300,
  },
  webview: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0b4cb3',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
});
