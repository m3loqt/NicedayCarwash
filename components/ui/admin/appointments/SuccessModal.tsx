import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

interface SuccessModalProps {
  visible: boolean;
  message: string;
  onClose: () => void;
}

const formatMessageWithBold = (message: string): React.ReactNode => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  const patterns = [
    /\(([A-Z0-9]+)\)/g,
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+,\s+\d{4}/g,
    /\d{1,2}:\d{2}\s*(AM|PM)/gi,
    /Bay\s+\d+/gi,
    /"([^"]+)"/g,
  ];

  const matches: Array<{ start: number; end: number; text: string }> = [];
  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(message)) !== null) {
      matches.push({ start: match.index, end: match.index + match[0].length, text: match[0] });
    }
  });

  matches.sort((a, b) => a.start - b.start);
  const filtered: typeof matches = [];
  matches.forEach((m) => {
    if (!filtered.some((e) => m.start < e.end && m.end > e.start)) filtered.push(m);
  });

  filtered.forEach((match, i) => {
    if (match.start > lastIndex) parts.push(message.substring(lastIndex, match.start));
    parts.push(
      <Text key={i} className="font-semibold text-[#1A1A1A]">
        {match.text}
      </Text>
    );
    lastIndex = match.end;
  });
  if (lastIndex < message.length) parts.push(message.substring(lastIndex));
  return parts.length > 0 ? <Text>{parts}</Text> : message;
};

export default function SuccessModal({ visible, message, onClose }: SuccessModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/40 justify-end">
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />

        <View className="bg-white rounded-t-xl">
          {/* Handle */}
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
          </View>

          {/* Body */}
          <View className="px-5 pt-6 pb-4 items-center">
            {/* Icon */}
            <View className="w-14 h-14 rounded-full bg-[#F5F5F5] items-center justify-center mb-4">
              <Ionicons name="checkmark" size={28} color="#1A1A1A" />
            </View>

            <Text className="text-[20px] font-bold text-[#1A1A1A] mb-2">Done!</Text>

            <Text className="text-[13px] text-[#666] text-center leading-[19px] px-4">
              {formatMessageWithBold(message)}
            </Text>
          </View>

          {/* Close button */}
          <View className="px-5 pb-10 pt-2">
            <TouchableOpacity
              className="bg-[#F5F5F5] rounded-2xl py-4 items-center"
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text className="text-[14px] font-semibold text-[#1A1A1A]">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
