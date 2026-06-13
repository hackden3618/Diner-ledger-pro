import React, { useCallback, useEffect, useRef } from 'react';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

interface AppBottomSheetChildrenProps {
  dismiss: () => void;
}

type AppBottomSheetChildren =
  | React.ReactNode
  | ((props: AppBottomSheetChildrenProps) => React.ReactNode);

interface AppBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  snapPoints?: (string | number)[];
  children: AppBottomSheetChildren;
  enableDynamicSizing?: boolean;
}

/**
 * A reliable wrapper around BottomSheetModal that handles the present/dismiss
 * lifecycle correctly — the modal is only mounted when `visible` is true,
 * auto-presents on mount, and calls `onClose` exactly once on dismiss.
 *
 * Usage:
 *   <AppBottomSheet visible={isOpen} onClose={() => setIsOpen(false)}>
 *     <BottomSheetScrollView>...</BottomSheetScrollView>
 *   </AppBottomSheet>
 */
export default function AppBottomSheet({
  visible,
  onClose,
  snapPoints,
  children,
  enableDynamicSizing,
}: AppBottomSheetProps) {
  // Don't render anything when not visible — guarantees a fresh ref each time.
  if (!visible) return null;

  return (
    <AppBottomSheetInner
      onClose={onClose}
      snapPoints={snapPoints}
      enableDynamicSizing={enableDynamicSizing}
    >
      {children}
    </AppBottomSheetInner>
  );
}

function AppBottomSheetInner({
  onClose,
  snapPoints: snapPointsProp,
  children,
  enableDynamicSizing,
}: Omit<AppBottomSheetProps, 'visible'>) {
  const ref = useRef<BottomSheetModal>(null);
  const snapPoints = React.useMemo(
    () => snapPointsProp ?? ['50%', '90%', '100%'],
    [snapPointsProp],
  );

  // Present immediately on mount.
  useEffect(() => {
    // requestAnimationFrame ensures the BottomSheetModal layout is ready.
    const id = requestAnimationFrame(() => {
      ref.current?.present();
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Expose dismiss method to children
  const dismiss = useCallback(() => {
    ref.current?.dismiss();
  }, []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    [],
  );

  // Render children - support both function and element children
  const renderedChildren = typeof children === 'function'
    ? children({ dismiss })
    : children;

  return (
    <BottomSheetModal
      ref={ref}
      index={1}
      snapPoints={snapPoints}
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: '#ffffff', borderRadius: 20 }}
      handleIndicatorStyle={{ backgroundColor: '#a1b0a3' }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      enableDynamicSizing={enableDynamicSizing}
      enablePanDownToClose
    >
      {renderedChildren}
    </BottomSheetModal>
  );
}
