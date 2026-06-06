import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography } from '../theme';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import BatchesScreen from '../screens/review/BatchesScreen';
import ReviewBatchScreen from '../screens/review/ReviewBatchScreen';
import RapidReviewScreen from '../screens/review/RapidReviewScreen';
import AIRevisionScreen from '../screens/review/AIRevisionScreen';
import QueueScreen from '../screens/review/QueueScreen';
import LearnScreen from '../screens/analytics/LearnScreen';
import CampaignInsightsScreen from '../screens/analytics/CampaignInsightsScreen';
import AdIntelligenceScreen from '../screens/analytics/AdIntelligenceScreen';
import BrandPlaybookScreen from '../screens/analytics/BrandPlaybookScreen';
import WizardGoalScreen from '../screens/wizard/WizardGoalScreen';
import WizardAudienceScreen from '../screens/wizard/WizardAudienceScreen';
import WizardRefinedAudienceScreen from '../screens/wizard/WizardRefinedAudienceScreen';
import WizardOfferPlatformsScreen from '../screens/wizard/WizardOfferPlatformsScreen';
import WizardCreativeStyleScreen from '../screens/wizard/WizardCreativeStyleScreen';
import WizardFinalReviewScreen from '../screens/wizard/WizardFinalReviewScreen';
import WizardFinalReviewSummaryScreen from '../screens/wizard/WizardFinalReviewSummaryScreen';
import GeneratingBatchScreen from '../screens/wizard/GeneratingBatchScreen';
import BatchGeneratingScreen from '../screens/review/BatchGeneratingScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  ReviewBatch: { batchId: string };
  BatchGenerating: { batchId: string };
  RapidReview: { batchId: string };
  AIRevision: { adId: string };
  CampaignInsights: { campaignId: string };
  AdIntelligence: { adId: string };
  BrandPlaybook: undefined;
  WizardGoal: undefined;
  WizardAudience: undefined;
  WizardRefinedAudience: undefined;
  WizardOfferPlatforms: undefined;
  WizardCreativeStyle: undefined;
  WizardFinalReview: undefined;
  WizardFinalReviewSummary: undefined;
  GeneratingBatch: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  Batches: undefined;
  Queue: undefined;
  Learn: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: Colors.surfaceContainerLowest,
          borderTopColor: Colors.outlineVariant + '33',
          borderTopWidth: 1,
          paddingTop: 6,
          height: 72,
        },
        tabBarLabelStyle: {
          ...Typography.labelCaps,
          fontSize: 10,
          marginTop: 2,
        },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof MaterialIcons.glyphMap> = {
            Dashboard: 'dashboard',
            Batches: 'layers',
            Queue: 'rule',
            Learn: 'school',
          };
          return <MaterialIcons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Batches" component={BatchesScreen} />
      <Tab.Screen name="Queue" component={QueueScreen} />
      <Tab.Screen name="Learn" component={LearnScreen} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen name="ReviewBatch" component={ReviewBatchScreen} />
        <Stack.Screen name="RapidReview" component={RapidReviewScreen} />
        <Stack.Screen name="AIRevision" component={AIRevisionScreen} />
        <Stack.Screen name="CampaignInsights" component={CampaignInsightsScreen} />
        <Stack.Screen name="AdIntelligence" component={AdIntelligenceScreen} />
        <Stack.Screen name="BrandPlaybook" component={BrandPlaybookScreen} />
        <Stack.Screen name="WizardGoal" component={WizardGoalScreen} />
        <Stack.Screen name="WizardAudience" component={WizardAudienceScreen} />
        <Stack.Screen name="WizardRefinedAudience" component={WizardRefinedAudienceScreen} />
        <Stack.Screen name="WizardOfferPlatforms" component={WizardOfferPlatformsScreen} />
        <Stack.Screen name="WizardCreativeStyle" component={WizardCreativeStyleScreen} />
        <Stack.Screen name="WizardFinalReview" component={WizardFinalReviewScreen} />
        <Stack.Screen name="WizardFinalReviewSummary" component={WizardFinalReviewSummaryScreen} />
        <Stack.Screen name="GeneratingBatch" component={GeneratingBatchScreen} />
        <Stack.Screen name="BatchGenerating" component={BatchGeneratingScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
