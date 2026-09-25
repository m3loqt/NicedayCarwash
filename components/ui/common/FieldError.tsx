import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

// Single source of truth for the error color used across Sign In/Sign Up (no central theme file
// exists in this app, so this is the de facto "error token" - import it wherever an error state
// needs the same red, e.g. an input's border).
export const ERROR_COLOR = '#D64545';

interface FieldErrorProps {
  message?: string;
}

// Small icon + text row shown under an errored field. Renders nothing when there's no message,
// so callers can use it unconditionally: <FieldError message={emailError} />.
export default function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <View className="flex-row items-start mt-1.5" accessibilityLiveRegion="polite">
      <Ionicons name="alert-circle" size={16} color={ERROR_COLOR} style={{ marginRight: 4, marginTop: 1 }} />
      <Text
        className="flex-1 text-[13px] font-inter-regular tracking-tight"
        style={{ color: ERROR_COLOR }}
      >
        {message}
      </Text>
    </View>
  );
}
