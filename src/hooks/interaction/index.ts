// Re-export hooks directly without importing them first

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