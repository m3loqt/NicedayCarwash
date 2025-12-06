import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Dimensions, Modal, Platform, Pressable, Text, TouchableOpacity, View } from 'react-native';

const { height } = Dimensions.get('window');

interface DateSelectionModalProps {
  visible: boolean;
  selectedDate: Date;
  calendarMonth: Date;
  branchSchedule: { openTime: string; closeTime: string } | null;
  onClose: () => void;
  onDateSelect: (date: Date) => void;
  onMonthNavigate: (direction: 'prev' | 'next') => void;
  checkDateAvailability: (date: Date, schedule?: { openTime: string; closeTime: string }) => { available: boolean; reason: string };
  loadBranchSchedule: () => Promise<{ openTime: string; closeTime: string } | null>;
  onUnavailableDate: (reason: string) => void;
}

export default function DateSelectionModal({
  visible,
  selectedDate,
  calendarMonth,
  branchSchedule,
  onClose,
  onDateSelect,
  onMonthNavigate,
  checkDateAvailability,
  loadBranchSchedule,
  onUnavailableDate,
}: DateSelectionModalProps) {
  // Calendar utility functions
  const getMonthName = (date: Date): string => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return months[date.getMonth()];
  };

  const getCalendarDays = (date: Date): (Date | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Calculate first and last day of the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get weekday index of first day (0 = Sunday, 6 = Saturday)
    const startDayOfWeek = firstDay.getDay();
    
    // Count total days in the month
    const daysInMonth = lastDay.getDate();
    
    // Get last day number of previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    const days: (Date | null)[] = [];
    
    // Prepend previous month's trailing days to align first day with correct weekday
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonthLastDay - i));
    }
    
    // Add all days of the current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    // Append next month's leading days to complete 42-day grid (6 weeks x 7 days)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    return days;
  };

  const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const isCurrentMonth = (date: Date, month: Date): boolean => {
    return date.getMonth() === month.getMonth() &&
           date.getFullYear() === month.getFullYear();
  };

  const isDateSelectable = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate >= today;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <BlurView intensity={20} className="flex-1 justify-end">
        {/* Backdrop: tapping this closes the modal */}
        <Pressable style={{ flex: 1 }} onPress={onClose} />

        <View
          className="bg-white rounded-t-2xl px-5 pt-5 border-t border-l border-r border-gray-200"
          style={{
            paddingBottom: Platform.OS === 'ios' ? 40 : 20,
            maxHeight: Dimensions.get('window').height * 0.6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 10,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
        >
          <Text className="text-xl font-bold text-[#333] mb-4">Select Date</Text>
          
          {/* Calendar Header with Month Navigation */}
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              onPress={() => onMonthNavigate('prev')}
              className="p-2"
            >
              <Ionicons name="chevron-back" size={20} color="#333" />
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-[#333]">
              {getMonthName(calendarMonth)} {calendarMonth.getFullYear()}
            </Text>
            <TouchableOpacity
              onPress={() => onMonthNavigate('next')}
              className="p-2"
            >
              <Ionicons name="chevron-forward" size={20} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Days of Week Header */}
          <View className="flex-row mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <View key={index} className="flex-1 items-center py-2">
                <Text className="text-sm font-medium text-gray-600">{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View className="mb-4">
            {Array.from({ length: 6 }, (_, weekIndex) => {
              const weekDays = getCalendarDays(calendarMonth).slice(weekIndex * 7, (weekIndex + 1) * 7);
              return (
                <View key={weekIndex} className="flex-row mb-1">
                  {weekDays.map((date, dayIndex) => {
                    if (!date) return <View key={dayIndex} className="flex-1" />;
                    
                    const isSelected = isSameDay(date, selectedDate);
                    const isCurrentMonthDay = isCurrentMonth(date, calendarMonth);
                    const isToday = isSameDay(date, new Date());
                    const isSelectable = isDateSelectable(date) && isCurrentMonthDay;
                    
                    return (
                      <TouchableOpacity
                        key={dayIndex}
                        className="flex-1 items-center justify-center py-2"
                        onPress={async () => {
                          if (isSelectable) {
                            // Reload schedule when selecting the same day to verify current availability
                            const isSelectingSameDay = isSameDay(date, selectedDate);
                            let currentSchedule = branchSchedule;
                            
                            if (isSelectingSameDay || !currentSchedule) {
                              currentSchedule = await loadBranchSchedule();
                            }
                            
                            // Verify selected date is within branch operating schedule
                            const availability = checkDateAvailability(date, currentSchedule || undefined);
                            
                            if (!availability.available) {
                              // Display unavailability message without closing calendar
                              onUnavailableDate(availability.reason);
                              return;
                            }
                            
                            // Date is valid, confirm selection and close modal
                            onDateSelect(date);
                            onClose();
                          }
                        }}
                        disabled={!isSelectable}
                      >
                        <View
                          className={`w-8 h-8 items-center justify-center rounded-full ${
                            isSelected
                              ? 'bg-[#F9EF08]'
                              : ''
                          }`}
                        >
                          <Text
                            className={`text-sm ${
                              isSelected
                                ? 'text-[#1E1E1E] font-semibold'
                                : isSelectable
                                ? 'text-[#333]'
                                : 'text-gray-400'
                            }`}
                          >
                            {date.getDate()}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

