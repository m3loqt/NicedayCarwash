import { Modal } from 'react-native';
import AppointmentDetails from '../../AppointmentDetails';

interface AppointmentDetailsModalProps {
  visible: boolean;
  branchName: string;
  branchAddress: string;
  branchImage: any;
  customerName?: string;
  vehicleName?: string;
  plateNumber?: string;
  classification?: string;
  date: string;
  time: string;
  orderSummary: Array<{ label: string; price: string }>;
  amountDue: string;
  paymentMethod: string;
  estimatedCompletion?: string;
  note?: string;
  status?: string;
  isPaid?: boolean;
  appointmentId?: string;
  isAdminView?: boolean;
  onClose: () => void;
}

export default function AppointmentDetailsModal({
  visible,
  branchName,
  branchAddress,
  branchImage,
  customerName,
  vehicleName,
  plateNumber,
  classification,
  date,
  time,
  orderSummary,
  amountDue,
  paymentMethod,
  estimatedCompletion,
  note,
  status,
  isPaid,
  appointmentId,
  isAdminView = false,
  onClose,
}: AppointmentDetailsModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <AppointmentDetails
        branchName={branchName}
        branchAddress={branchAddress}
        branchImage={branchImage}
        customerName={customerName}
        vehicleName={vehicleName}
        plateNumber={plateNumber}
        classification={classification}
        date={date}
        time={time}
        orderSummary={orderSummary}
        amountDue={amountDue}
        paymentMethod={paymentMethod}
        estimatedCompletion={estimatedCompletion}
        note={note}
        status={status}
        isPaid={isPaid}
        appointmentId={appointmentId}
        isAdminView={isAdminView}
        onBack={onClose}
      />
    </Modal>
  );
}

