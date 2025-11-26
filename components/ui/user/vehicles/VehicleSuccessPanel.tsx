import { Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface VehicleSuccessPanelProps {
  message: string;
  onContinue: () => void;
  iconType?: 'success' | 'delete';
}

export default function VehicleSuccessPanel({ 
  message, 
  onContinue, 
  iconType = 'success' 
}: VehicleSuccessPanelProps) {
  const getIcon = () => {
    if (iconType === 'delete') {
      return (
        <View className="w-16 h-16 bg-red-500 rounded-full items-center justify-center">
          <Image
            source={require('../../../../assets/images/remove_icon.png')}
            className="w-8 h-8"
            resizeMode="contain"
          />
        </View>
      );
    }
    
    return (
      <Image
        source={require('../../../../assets/images/checkicon.png')}
        className="w-16 h-16"
        resizeMode="contain"
      />
    );
  };

  const getBackgroundColor = () => {
    return iconType === 'delete' ? 'bg-red-500' : 'bg-[#F9EF08]';
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100 items-center justify-center" edges={['top', 'bottom']}>
      <TouchableOpacity
        className="absolute inset-0 items-center justify-center"
        onPress={onContinue}
        activeOpacity={1}
      >
        {/* Success/Delete Icon */}
        <View className={`w-32 h-32 ${getBackgroundColor()} rounded-full items-center justify-center mb-8 shadow-md`}>
          {getIcon()}
        </View>

        {/* Message */}
        <Text className="text-2xl font-bold text-gray-800 text-center mb-4">
          {message}
        </Text>

        {/* Continue Prompt */}
        <Text className="text-base text-gray-500 text-center">
          Click anywhere to continue
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

