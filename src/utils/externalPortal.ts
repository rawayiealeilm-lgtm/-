export interface ExternalPortalPayload {
  url: string;
  title?: string;
}

export const EXTERNAL_PORTAL_OPEN_EVENT = 'mawaedh:open-external-portal';

export function openExternalPortal(url: string, title?: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<ExternalPortalPayload>(EXTERNAL_PORTAL_OPEN_EVENT, {
      detail: {url, title},
    }),
  );
}
