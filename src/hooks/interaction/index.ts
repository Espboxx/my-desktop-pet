// Import the hooks we created
import { useActionHandling } from './useActionHandling';
import { useContextMenuHandling } from './useContextMenuHandling';
import { useDragHandling } from './useDragHandling';
import { useEyeTracking } from './useEyeTracking';
import { useIdleHandling } from './useIdleHandling';
import { useInteractionDetection } from './useInteractionDetection';
import { usePetInteraction } from './usePetInteraction'; // Import the main hook

// Export individual hooks (named exports)
export { useActionHandling } from './useActionHandling';
export { useContextMenuHandling } from './useContextMenuHandling';
export { useDragHandling } from './useDragHandling';
export { useEyeTracking } from './useEyeTracking';
export { useIdleHandling } from './useIdleHandling';
export { useInteractionDetection } from './useInteractionDetection';

// Export all types
export * from './types';

// Export the main orchestrator hook as the default export
export { usePetInteraction as default } from './usePetInteraction';