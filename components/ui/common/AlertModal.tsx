import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertModalProps {
  visible: boolean;
  title?: string;
  message: string;
  type?: AlertType;
  buttons?: AlertButton[];
  onClose: () => void;
  dismissOnBackdrop?: boolean;
}

/**
 * Formats message string with semi-bold styling for plate numbers, dates, times, and bay numbers
 * Uses nested Text components to apply font-semibold to specific parts
 */
const formatMessageWithBold = (message: string): React.ReactNode => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Regex patterns matching plate numbers, dates, times, bay numbers, and quoted text
  const patterns = [
    /\(([A-Z0-9]+)\)/g, // Matches plate numbers in parentheses
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+,\s+\d{4}/g, // Matches full date format
    /\d{1,2}:\d{2}\s*(AM|PM)/gi, // Matches 12-hour time format
    /Bay\s+\d+/gi, // Matches bay number references
    /"([^"]+)"/g, // Matches quoted text
  ];

  const matches: Array<{ start: number; end: number; text: string }> = [];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(message)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
      });
    }
  });

  // Sorting matches by their start position in the message
  matches.sort((a, b) => a.start - b.start);

  // Filtering out overlapping matches, keeping the first occurrence
  const filteredMatches: Array<{ start: number; end: number; text: string }> = [];
  matches.forEach(match => {
    const overlaps = filteredMatches.some(
      existing => match.start < existing.end && match.end > existing.start
    );
    if (!overlaps) {
      filteredMatches.push(match);
    }
  });

  // Building formatted message with bold styling for matched patterns
  filteredMatches.forEach((match, index) => {
    // Adding text segment before the current match
    if (match.start > lastIndex) {
      parts.push(message.substring(lastIndex, match.start));
    }

    // Adding matched text with semi-bold styling
    parts.push(
      <Text key={`bold-${index}`} className="font-inter-semibold">
        {match.text}
      </Text>
    );

    lastIndex = match.end;
  });

  // Adding remaining text after all matches
  if (lastIndex < message.length) {
    parts.push(message.substring(lastIndex));
  }

  return parts.length > 0 ? <Text>{parts}</Text> : message;
};

/**
 * Modular Alert Modal Component
 * Bottom-sheet style alert/confirmation matching the app's drawer pattern
 * (see CancelReasonModal). Supports success, error, warning, info, and
 * multi-button confirmation dialogs.
 */
export default function AlertModal({
  visible,
  title,
  message,
  type = 'info',
  buttons,
  onClose,
  dismissOnBackdrop = true,
}: AlertModalProps) {
  const getIconConfig = () => {
    switch (type) {
      case 'success':
        return { name: 'checkmark' as const, color: '#1A1A1A' };
      case 'error':
        return { name: 'close-circle' as const, color: '#DC2626' };
      case 'warning':
        return { name: 'warning' as const, color: '#D97706' };
      case 'info':
      default:
        return { name: 'information-circle' as const, color: '#1A1A1A' };
    }
  };

  const getDefaultTitle = () => {
    if (title) return title;
    switch (type) {
      case 'success':
        return 'Success!';
      case 'error':
        return 'Error';
      case 'warning':
        return 'Warning';
      case 'info':
      default:
        return 'Notice';
    }
  };

  const iconConfig = getIconConfig();
  const displayTitle = getDefaultTitle();
  const hasButtons = buttons && buttons.length > 0;
  const isConfirmation = hasButtons && buttons.length > 1;
  const stackButtons = hasButtons && buttons.length > 2;

  const handleBackdropPress = () => {
    if (dismissOnBackdrop && !isConfirmation) {
      onClose();
    }
  };

  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/35 justify-end">
        {/* Backdrop pressable area that closes modal for non-confirmation dialogs */}
        <Pressable className="flex-1" onPress={handleBackdropPress} />

        <SafeAreaView edges={['bottom']} className="bg-white rounded-t-3xl">
          {/* Drag handle */}
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
          </View>

          {/* Close button shown only for non-confirmation dialogs */}
          {!isConfirmation && (
            <TouchableOpacity
              className="absolute top-4 right-5 z-10"
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color="#999" />
            </TouchableOpacity>
          )}

          <View className="px-6 pt-3 pb-8">
            {/* Icon display */}
            <View className="items-center mb-1">
              <View className="w-12 h-12 rounded-full bg-[#F5F5F5] items-center justify-center mb-3">
                <Ionicons name={iconConfig.name} size={24} color={iconConfig.color} />
              </View>

              {/* Title text */}
              <Text className="text-[18px] font-inter-semibold tracking-tight text-[#1A1A1A] text-center mb-1.5">
                {displayTitle}
              </Text>

              {/* Message text with formatted bold sections */}
              <Text className="text-[13px] font-inter-regular tracking-tight text-[#666] text-center leading-5">
                {formatMessageWithBold(message)}
              </Text>
            </View>

            {/* Action buttons */}
            {hasButtons && (
              <View className={`mt-6 gap-3 ${stackButtons ? '' : 'flex-row'}`}>
                {buttons.map((button, index) => {
                  const isCancel = button.style === 'cancel';

                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleButtonPress(button)}
                      activeOpacity={0.85}
                      className={`flex-1 py-3.5 rounded-full items-center justify-center ${
                        isCancel ? 'bg-[#F5F5F5]' : 'bg-[#F9EF08]'
                      }`}
                    >
                      <Text
                        className={`text-[14px] font-inter-bold tracking-tight ${
                          isCancel ? 'text-[#1A1A1A]' : 'text-[#1A1A00]'
                        }`}
                      >
                        {button.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
