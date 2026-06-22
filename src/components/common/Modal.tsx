import * as Dialog from '@radix-ui/react-dialog';
import { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-ide-bg border border-ide-border p-6 rounded-lg shadow-xl z-50 w-full max-w-md text-ide-text">
          <Dialog.Title className="text-lg font-bold mb-4 text-white">{title}</Dialog.Title>
          <Dialog.Description className="sr-only">{title} dialog</Dialog.Description>
          <div className="mt-2">{children}</div>
          <Dialog.Close asChild>
            <button className="absolute top-3 right-3 text-ide-text hover:text-white cursor-pointer" aria-label="Close">
              &times;
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
