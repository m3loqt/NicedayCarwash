import AlertModal, { AlertButton, AlertType } from '@/components/ui/common/AlertModal';
import React, { useCallback, useState } from 'react';

interface AlertOptions {
  title?: string;
  type?: AlertType;
  buttons?: AlertButton[];
  dismissOnBackdrop?: boolean;
}

export function useAlert() {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AlertType>('info');
  const [buttons, setButtons] = useState<AlertButton[] | undefined>(undefined);
  const [dismissOnBackdrop, setDismissOnBackdrop] = useState(true);

  const showAlert = useCallback((
    message: string,
    options?: AlertOptions
  ) => {
    setMessage(message);
    setTitle(options?.title);
    setType(options?.type || 'info');
    setButtons(options?.buttons);
    setDismissOnBackdrop(options?.dismissOnBackdrop ?? true);
    setVisible(true);
  }, []);

  const hideAlert = useCallback(() => {
    setVisible(false);
  }, []);

  // Convenience method matching Alert.alert() API
  const alert = useCallback((
    titleOrMessage: string,
    messageOrButtons?: string | AlertButton[],
    buttons?: AlertButton[]
  ) => {
    let buttonArray: AlertButton[] | undefined = undefined;
    
    // Handling Alert.alert(title, message, buttons)
    if (typeof messageOrButtons === 'string' && buttons !== undefined) {
      setTitle(titleOrMessage);
      setMessage(messageOrButtons);
      setButtons(buttons);
      setType('info');
      buttonArray = buttons;
    } 
    // Handling Alert.alert(title, message) - two strings
    else if (typeof messageOrButtons === 'string') {
      setTitle(titleOrMessage);
      setMessage(messageOrButtons);
      setButtons(undefined);
      // Auto-detecting type from title
      const titleLower = titleOrMessage.toLowerCase();
      if (titleLower.includes('error')) {
        setType('error');
      } else if (titleLower.includes('success')) {
        setType('success');
      } else if (titleLower.includes('warning')) {
        setType('warning');
      } else {
        setType('info');
      }
      buttonArray = undefined;
    }
    // Handling Alert.alert(title, buttons) - title + buttons array
    else if (Array.isArray(messageOrButtons)) {
      setTitle(titleOrMessage);
      setMessage('');
      setButtons(messageOrButtons);
      setType('info');
      buttonArray = messageOrButtons;
    }
    // Handling simple alert: alert(message)
    else {
      setTitle(undefined);
      setMessage(titleOrMessage);
      setButtons(undefined);
      setType('info');
      buttonArray = undefined;
    }
    
    // Preventing backdrop dismissal for confirmation dialogs (2+ buttons)
    // Single button alerts can still be dismissed via backdrop
    const isConfirmation = buttonArray && buttonArray.length > 1;
    setDismissOnBackdrop(!isConfirmation);
    setVisible(true);
  }, []);

  const AlertComponent = React.useMemo(() => (
    <AlertModal
      visible={visible}
      title={title}
      message={message}
      type={type}
      buttons={buttons}
      onClose={hideAlert}
      dismissOnBackdrop={dismissOnBackdrop}
    />
  ), [visible, title, message, type, buttons, dismissOnBackdrop, hideAlert]);

  return {
    showAlert,
    hideAlert,
    alert, // For Alert.alert() compatibility
    AlertComponent,
  };
}
