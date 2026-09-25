import { ERROR_COLOR } from '@/components/ui/common/FieldError';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

interface CredentialErrorBannerProps {
  message: string;
}

// Inline banner shown above the Sign In button for wrong-credential / rate-limited / disabled
// errors - deliberately not tied to either input, since a wrong-credential failure shouldn't
// reveal which field was the actual problem.
export default function CredentialErrorBanner({ message }: CredentialErrorBannerProps) {
  return (
    <View
      className="flex-row items-start mb-4"
      style={{ backgroundColor: 'rgba(214,69,69,0.08)', borderRadius: 12, padding: 12 }}
      accessibilityLiveRegion="polite"
    >
      <Ionicons name="alert-circle" size={18} color={ERROR_COLOR} style={{ marginRight: 8, marginTop: 1 }} />
      <Text className="flex-1 text-[13px] font-inter-regular tracking-tight text-[#1A1A1A]" style={{ lineHeight: 18 }}>
        {message}
      </Text>
    </View>
  );
}
