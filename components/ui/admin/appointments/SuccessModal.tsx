import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';

interface SuccessModalProps {
  visible: boolean;
  message: string;
  onClose: () => void;
}

/**
 * Formats message string with semi-bold styling for plate numbers, dates, times, and bay numbers
 * Uses nested Text components to apply font-semibold to specific parts
 */
const formatMessageWithBold = (message: string): React.ReactNode => {
  // Pattern to match: (plateNumber), dates like "December 7, 2025", times like "7:00 AM", and "Bay X"
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  // Match patterns: (PLATE), dates (Month Day, Year), times (H:MM AM/PM), Bay numbers, and cancel reasons in quotes
  const patterns = [
    /\(([A-Z0-9]+)\)/g, // Plate number in parentheses
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+,\s+\d{4}/g, // Date
    /\d{1,2}:\d{2}\s*(AM|PM)/gi, // Time
    /Bay\s+\d+/gi, // Bay number
    /"([^"]+)"/g, // Text in quotes (for cancel reasons and other quoted text)
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
  
  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);
  
  // Remove overlapping matches (keep the first one)
  const filteredMatches: Array<{ start: number; end: number; text: string }> = [];
  matches.forEach(match => {
    const overlaps = filteredMatches.some(
      existing => match.start < existing.end && match.end > existing.start
    );
    if (!overlaps) {
      filteredMatches.push(match);
    }
  });
  
  // Build the formatted message
  filteredMatches.forEach((match, index) => {
    // Add text before match
    if (match.start > lastIndex) {
      parts.push(message.substring(lastIndex, match.start));
    }
    
    // Add semi-bold match
    parts.push(
      <Text key={`bold-${index}`} className="font-semibold">
        {match.text}
      </Text>
    );
    
    lastIndex = match.end;
  });
  
  // Add remaining text
  if (lastIndex < message.length) {
    parts.push(message.substring(lastIndex));
  }
  
  return parts.length > 0 ? <Text>{parts}</Text> : message;
};

/**
 * Branded Success Modal Component
 * Displays success messages with NicedayCarwash branding (yellow #F9EF08)
 * Used for appointment actions (accept, complete, cancel)
 */
export default function SuccessModal({
  visible,
  message,
  onClose,
}: SuccessModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={80} tint="light" className="flex-1 justify-center items-center">
        {/* Backdrop: tapping this closes the modal */}
        <Pressable 
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} 
          onPress={onClose} 
        />

        {/* Modal Content */}
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
          {/* Close Button - Top Right */}
          <TouchableOpacity
            className="absolute top-4 right-4 z-10"
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>

          {/* Success Icon */}
          <View className="items-center mb-6 mt-2">
            <View className="w-24 h-24 bg-[#F9EF08] rounded-full items-center justify-center mb-4 shadow-lg">
              <Ionicons name="checkmark" size={48} color="white" />
            </View>

            {/* Success Message */}
            <Text className="text-3xl font-bold text-[#1E1E1E] text-center mb-2">
              Success!
            </Text>
            <View className="items-center">
              <Text className="text-base text-gray-600 font-normal text-center">
                {formatMessageWithBold(message)}
              </Text>
            </View>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}
