import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';

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
      <Text key={`bold-${index}`} className="font-semibold">
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
 * Displays alerts with NicedayCarwash branding matching SuccessModal UI
 * Supports different types: success, error, warning, info
 * Supports confirmation dialogs with custom buttons
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
        return {
          name: 'checkmark' as const,
          color: '#F9EF08',
          bgColor: '#F9EF08',
        };
      case 'error':
        return {
          name: 'close-circle' as const,
          color: '#EF4444',
          bgColor: '#EF4444',
        };
      case 'warning':
        return {
          name: 'warning' as const,
          color: '#F59E0B',
          bgColor: '#F59E0B',
        };
      case 'info':
      default:
        return {
          name: 'information-circle' as const,
          color: '#F9EF08',
          bgColor: '#F9EF08',
        };
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
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={80} tint="light" className="flex-1 justify-center items-center">
        {/* Backdrop pressable area that closes modal for non-confirmation dialogs */}
        <Pressable 
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} 
          onPress={handleBackdropPress} 
        />

        {/* Modal content container */}
        <View 
          className="bg-gray-50 rounded-3xl px-6 py-6 mx-6 w-[80%] max-w-sm relative z-10 border border-gray-200"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          {/* Close button shown only for non-confirmation dialogs */}
          {!isConfirmation && (
            <TouchableOpacity
              className="absolute top-4 right-4 z-10"
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          )}

          {/* Icon display */}
          <View className="items-center mb-6 mt-2">
            <View 
              className="w-24 h-24 rounded-full items-center justify-center mb-4 shadow-lg"
              style={{ backgroundColor: iconConfig.bgColor }}
            >
              <Ionicons name={iconConfig.name} size={48} color="white" />
            </View>

            {/* Title text */}
            <Text className="text-3xl font-bold text-[#1E1E1E] text-center mb-2">
              {displayTitle}
            </Text>
            
            {/* Message text with formatted bold sections */}
            <View className="items-center">
              <Text className="text-base text-gray-600 font-normal text-center">
                {formatMessageWithBold(message)}
              </Text>
            </View>
          </View>

          {/* Action buttons container */}
          {hasButtons && (
            <View className="flex-row gap-3 justify-center mt-4">
              {buttons.map((button, index) => {
                const isDestructive = button.style === 'destructive';
                const isCancel = button.style === 'cancel';
                
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleButtonPress(button)}
                    className={`px-6 py-3 rounded-xl ${
                      isDestructive
                        ? 'bg-[#F9EF08]'
                        : isCancel
                        ? 'bg-gray-300'
                        : 'bg-[#F9EF08]'
                    }`}
                  >
                    <Text
                      className="text-center font-semibold text-white"
                      style={{ fontSize: 16 }}
                    >
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </BlurView>
    </Modal>
  );
}
