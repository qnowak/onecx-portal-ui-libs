import { Workspace } from '@onecx/integration-interface';
import { AppStateProvider } from '../contexts/appStateContext';
import { FakeTopic } from './fake-topic';

const mockWorkspace: Workspace = {
  id: 'workspace-123',
  displayName: 'Mock Workspace',
  portalName: 'mock-portal',
  workspaceName: 'mock-workspace',
  description: 'A mock workspace for testing',
  themeId: 'theme-1',
  themeName: 'Light Theme',
  footerLabel: 'Footer Mock',
  homePage: '/home',
  baseUrl: 'http://example.com',
  companyName: 'Mock Company',
  portalRoles: ['admin', 'user'],
  microfrontendRegistrations: [],
  logoUrl: 'http://example.com/logo.png',
  logoSmallImageUrl: 'http://example.com/logo-small.png',
  routes: [
    {
      appId: 'onecx-workspace-ui',
      productName: 'onecx-workspace',
      baseUrl: 'http://example.com/workspace/baseurl',
      endpoints: [
        { name: 'details', path: '/details/{id}' },
        { name: 'edit', path: '[[details]]' },
        { name: 'change', path: '[[edit]]' },
      ],
    },
  ],
};

export const mockCurrentWorkspace$ = new FakeTopic(mockWorkspace);

export const mockAppStateContext = {
  globalError$: new FakeTopic(null),
  globalLoading$: new FakeTopic(false),
  currentMfe$: new FakeTopic(null),
  currentPage$: new FakeTopic(null),
  currentWorkspace$: mockCurrentWorkspace$,
  currentPortal$: mockCurrentWorkspace$,
  isAuthenticated$: new FakeTopic(true),
};

export const MockAppStateProvider: React.FC<{
  children: React.ReactNode;
  mockAppState?: any;
}> = ({ children, mockAppState }) => (
  <AppStateProvider value={mockAppState || (mockAppStateContext as any)}>
    {children}
  </AppStateProvider>
);
