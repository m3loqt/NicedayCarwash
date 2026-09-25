import { Text, TextProps } from 'react-native';

// Shared visual style for every in-app text link on a screen (as opposed to a filled button):
// charcoal, semibold, underlined. Just a plain <Text> under the hood so it works both as a
// standalone link (wrap in AppButton for press feedback) and nested inline inside another
// <Text>'s sentence (RN gives nested Text its own touch target via onPress).
// Callers control size via className - intentionally not baked in here since it varies by
// context (e.g. a 13px standalone link vs. a 12px inline helper-text link).
export default function TextLink({ className = '', ...props }: TextProps) {
  return <Text className={`font-inter-semibold tracking-tight text-[#1A1A1A] underline ${className}`} {...props} />;
}
