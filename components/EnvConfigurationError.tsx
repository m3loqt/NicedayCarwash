import { ScrollView, Text, View } from 'react-native';

import type { EnvCheckResult } from '@/lib/env';

type Props = { result: Extract<EnvCheckResult, { ok: false }> };

/**
 * Shown when required EXPO_PUBLIC_FIREBASE_* vars are missing (misconfigured build).
 */
export default function EnvConfigurationError({ result }: Props) {
  return (
    <View className="flex-1 justify-center bg-white px-6">
      <Text className="text-xl font-bold text-[#1A1A1A] mb-2">Configuration error</Text>
      <Text className="text-[15px] text-[#666] mb-4">
        This build is missing required public Firebase environment variables. Set them in{' '}
        <Text className="font-mono text-[13px]">.env</Text> (local) or EAS secrets (production),
        then restart the dev server.
      </Text>
      <Text className="text-[12px] font-semibold text-[#999] uppercase tracking-wider mb-2">
        Missing keys
      </Text>
      <ScrollView className="max-h-40 border border-[#EEE] rounded-lg p-3 bg-[#FAFAFA]">
        {result.missing.map((key) => (
          <Text key={key} className="font-mono text-[13px] text-[#1A1A1A] py-1">
            {key}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}
