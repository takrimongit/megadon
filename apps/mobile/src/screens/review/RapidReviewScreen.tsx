import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

const ads = [
  { id: '1', headline: 'Shop the Summer Drop', platform: 'Instagram Reel', hook: 'Summer just got better ☀️', cta: 'Shop Now' },
  { id: '2', headline: 'Limited Time: 30% Off', platform: 'TikTok Short', hook: 'Flash sale starts NOW 🔥', cta: 'Grab the Deal' },
  { id: '3', headline: 'Your Style, Elevated', platform: 'Facebook Feed', hook: 'Level up your wardrobe ✨', cta: 'Explore Collection' },
  { id: '4', headline: "Don't Miss Out", platform: 'Instagram Story', hook: 'Ends tonight at midnight 🕛', cta: 'Shop Before It\'s Gone' },
];

export default function RapidReviewScreen() {
  const navigation = useNavigation();
  const [index, setIndex] = useState(0);
  const [approved, setApproved] = useState(0);
  const [rejected, setRejected] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => position.setValue({ x: gesture.dx, y: gesture.dy }),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > SWIPE_THRESHOLD) {
        swipe('right');
      } else if (gesture.dx < -SWIPE_THRESHOLD) {
        swipe('left');
      } else {
        Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      }
    },
  });

  const swipe = (direction: 'left' | 'right') => {
    const toX = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
    Animated.timing(position, { toValue: { x: toX, y: 0 }, duration: 250, useNativeDriver: false }).start(() => {
      if (direction === 'right') setApproved((a) => a + 1);
      else setRejected((r) => r + 1);
      position.setValue({ x: 0, y: 0 });
      setIndex((i) => i + 1);
    });
  };

  const currentAd = ads[index];
  const done = index >= ads.length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AppHeader showBack onBack={() => navigation.goBack()} title="Rapid Review" />
      <View style={styles.scoreBar}>
        <View style={styles.scoreItem}>
          <MaterialIcons name="check-circle" size={16} color={Colors.success} />
          <Text style={styles.scoreText}>{approved} approved</Text>
        </View>
        <Text style={styles.progressText}>{Math.min(index, ads.length)} / {ads.length}</Text>
        <View style={styles.scoreItem}>
          <MaterialIcons name="cancel" size={16} color={Colors.error} />
          <Text style={styles.scoreText}>{rejected} rejected</Text>
        </View>
      </View>

      <View style={styles.cardArea}>
        {done ? (
          <View style={styles.doneCard}>
            <MaterialIcons name="celebration" size={48} color={Colors.primary} />
            <Text style={styles.doneTitle}>Batch Reviewed!</Text>
            <Text style={styles.doneSubtitle}>{approved} approved · {rejected} rejected</Text>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backBtnText}>Back to Batch</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.View
            {...panResponder.panHandlers}
            style={[styles.card, { transform: [...position.getTranslateTransform(), { rotate }] }]}
          >
            <View style={styles.adPreview}>
              <MaterialIcons name="image" size={48} color={Colors.outlineVariant} />
              <Text style={styles.adHook}>{currentAd.hook}</Text>
              <Text style={styles.adHeadline}>{currentAd.headline}</Text>
              <View style={styles.ctaBtn}>
                <Text style={styles.ctaText}>{currentAd.cta}</Text>
              </View>
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.platformText}>{currentAd.platform}</Text>
            </View>
          </Animated.View>
        )}
      </View>

      {!done && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.rejectBtn} onPress={() => swipe('left')}>
            <MaterialIcons name="close" size={28} color={Colors.error} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.reviseBtn} onPress={() => {}}>
            <MaterialIcons name="edit" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.approveBtn} onPress={() => swipe('right')}>
            <MaterialIcons name="check" size={28} color={Colors.success} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scoreBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.sm,
  },
  scoreItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scoreText: { ...Typography.labelCaps, color: Colors.onSurfaceVariant },
  progressText: { ...Typography.labelCaps, color: Colors.primary, fontWeight: '700' },
  cardArea: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  card: {
    width: '100%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  adPreview: {
    height: 360,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  adHook: { ...Typography.bodyBase, color: Colors.onSurfaceVariant, textAlign: 'center' },
  adHeadline: { ...Typography.headlineMd, color: Colors.onSurface, textAlign: 'center' },
  ctaBtn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: Radius.DEFAULT,
  },
  ctaText: { ...Typography.titleMd, color: Colors.onPrimary },
  cardFooter: { padding: Spacing.md, alignItems: 'center' },
  platformText: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, textTransform: 'uppercase' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
  },
  rejectBtn: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.error + '1A',
    borderWidth: 2, borderColor: Colors.error + '33',
    alignItems: 'center', justifyContent: 'center',
  },
  reviseBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
  },
  approveBtn: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.success + '1A',
    borderWidth: 2, borderColor: Colors.success + '33',
    alignItems: 'center', justifyContent: 'center',
  },
  doneCard: {
    alignItems: 'center', gap: Spacing.md,
    padding: Spacing.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    width: '100%',
  },
  doneTitle: { ...Typography.headlineMd, color: Colors.onSurface },
  doneSubtitle: { ...Typography.bodyBase, color: Colors.onSurfaceVariant },
  backBtn: {
    paddingHorizontal: Spacing.lg, paddingVertical: 12,
    backgroundColor: Colors.primaryFixed, borderRadius: Radius.DEFAULT,
  },
  backBtnText: { ...Typography.titleMd, color: Colors.primary },
});
