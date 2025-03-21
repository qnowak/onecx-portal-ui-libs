import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { BehaviorSubject, firstValueFrom, map, filter, skip } from 'rxjs';
import {
  PermissionsTopic,
  UserProfile,
  UserProfileTopic,
} from '@onecx/integration-interface';
import { DEFAULT_LANG } from '../api/constants';

type UserContextType = {
  profile$: UserProfileTopic;
  permissions$: BehaviorSubject<string[]>;
  lang$: BehaviorSubject<string>;
  hasPermission: (permissionKey: string | string[]) => boolean;
  isInitialized: Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

/**
 * Needs to be used within UserContext
 */
const useUserService = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserService must be used within a UserProvider');
  }
  return context;
};

type UserProviderProps = { children: React.ReactNode };

const determineLanguage = (): string | undefined => {
  if (
    typeof window === 'undefined' ||
    typeof window.navigator === 'undefined'
  ) {
    return undefined;
  }

  let browserLang: string | undefined = window.navigator.languages
    ? window.navigator.languages[0]
    : window.navigator.language;

  if (!browserLang) {
    return undefined;
  }

  if (browserLang.indexOf('-') !== -1) {
    browserLang = browserLang.split('-')[0];
  }

  if (browserLang.indexOf('_') !== -1) {
    browserLang = browserLang.split('_')[0];
  }

  return browserLang;
};

const extractPermissions = (userProfile: UserProfile): string[] | null => {
  if (userProfile?.memberships) {
    const permissions: string[] = [];
    userProfile.memberships.forEach((m) => {
      m.roleMemberships?.forEach((r) => {
        r.permissions?.forEach((p) => {
          if (p?.key) {
            permissions.push(p.key);
          }
        });
      });
    });
    return permissions;
  }
  return null;
};

const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const profile$ = useMemo(() => new UserProfileTopic(), []);
  const permissions$ = useMemo(() => new BehaviorSubject<string[]>([]), []);
  const lang$ = useMemo(
    () => new BehaviorSubject(determineLanguage() ?? DEFAULT_LANG),
    []
  );
  const permissionsTopic$ = useMemo(() => new PermissionsTopic(), []);

  const [oldStylePermissionsInitialized] = useState(() =>
    firstValueFrom(permissions$.pipe(skip(1)))
  );

  const hasPermission = (permissionKey: string | string[]): boolean => {
    if (Array.isArray(permissionKey)) {
      return permissionKey.every((key) => hasPermission(key));
    }
    const oldConceptResult = permissions$.getValue().includes(permissionKey);
    const result =
      permissionsTopic$.getValue()?.includes(permissionKey) ?? oldConceptResult;

    if (!result) {
      console.log(`👮‍♀️ No permission for: ${permissionKey}`);
    }
    return result;
  };

  const isInitialized = useMemo(
    () =>
      Promise.all([
        permissionsTopic$.isInitialized,
        oldStylePermissionsInitialized,
        profile$.isInitialized,
        // eslint-disable-next-line @typescript-eslint/no-empty-function
      ]).then(() => {}),
    [permissionsTopic$, oldStylePermissionsInitialized, profile$]
  );

  useEffect(() => {
    const langSubscription = profile$
      .pipe(
        map(
          (profile) =>
            profile.accountSettings?.localeAndTimeSettings?.locale ??
            determineLanguage() ??
            DEFAULT_LANG
        )
      )
      .subscribe(lang$);

    const permissionsSubscription = profile$
      .pipe(
        map((profile) => extractPermissions(profile)),
        filter((permissions): permissions is string[] => !!permissions)
      )
      .subscribe(permissions$);

    return () => {
      langSubscription.unsubscribe();
      permissionsSubscription.unsubscribe();
      profile$.destroy();
    };
  }, [profile$, lang$, permissions$]);

  const value = useMemo(
    () => ({
      profile$,
      permissions$,
      lang$,
      hasPermission,
      isInitialized,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile$, permissions$, lang$, isInitialized]
  );
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export { UserProvider, useUserService };
