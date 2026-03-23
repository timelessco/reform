import type { QueryClient } from "@tanstack/react-query";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { addFavorite, getFavorites, removeFavorite } from "@/lib/fn/favorites";
import { getNavigationForms } from "@/lib/fn/forms";
import { getWorkspaces } from "@/lib/fn/workspaces";

export type WorkspaceNavigationSummary = {
  id: string;
  organizationId: string;
  createdByUserId?: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type FormNavigationSummary = {
  id: string;
  title: string;
  workspaceId: string;
  status: string;
  updatedAt: string;
  icon?: string | null;
  customization?: Record<string, string> | null;
};

export type FavoriteSummary = {
  id: string;
  userId: string;
  formId: string;
  createdAt: string;
};

export type SidebarWorkspaceWithForms = WorkspaceNavigationSummary & {
  forms: FormNavigationSummary[];
};

export type NavigationSidebarData = {
  workspaces: SidebarWorkspaceWithForms[];
  favoriteForms: FormNavigationSummary[];
};

export const navigationWorkspacesQueryKey = ["navigation-workspaces"] as const;
export const navigationFormsQueryKey = (activeOrgId?: string) =>
  ["navigation-forms", activeOrgId] as const;
export const navigationFavoritesQueryKey = ["navigation-favorites"] as const;

export const buildNavigationSidebarData = ({
  activeOrgId,
  favorites,
  forms,
  workspaces,
}: {
  activeOrgId?: string;
  favorites: FavoriteSummary[];
  forms: FormNavigationSummary[];
  workspaces: WorkspaceNavigationSummary[];
}): NavigationSidebarData => {
  if (!activeOrgId) {
    return {
      workspaces: [],
      favoriteForms: [],
    };
  }

  const activeWorkspaces = workspaces.filter(
    (workspace) => workspace.organizationId === activeOrgId,
  );
  const formsByWorkspaceId = new Map<string, FormNavigationSummary[]>();

  for (const form of forms) {
    const workspaceForms = formsByWorkspaceId.get(form.workspaceId) ?? [];
    workspaceForms.push(form);
    formsByWorkspaceId.set(form.workspaceId, workspaceForms);
  }

  const favoriteFormIds = new Set(favorites.map((favorite) => favorite.formId));
  const favoriteForms = forms
    .filter((form) => favoriteFormIds.has(form.id))
    .toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return {
    workspaces: activeWorkspaces.map((workspace) => ({
      ...workspace,
      forms: formsByWorkspaceId.get(workspace.id) ?? [],
    })),
    favoriteForms,
  };
};

export const createToggleFavoriteMutationOptions = (queryClient: QueryClient, userId?: string) =>
  mutationOptions({
    mutationFn: async ({ formId }: { formId: string }) => {
      const existingFavorites =
        queryClient.getQueryData<FavoriteSummary[]>(navigationFavoritesQueryKey) ?? [];
      const isFavorite = existingFavorites.some((favorite) => favorite.formId === formId);

      if (isFavorite) {
        await removeFavorite({
          data: { formId },
        });
        return { formId, isFavorite: false };
      }

      await addFavorite({
        data: { formId },
      });

      return { formId, isFavorite: true };
    },
    onMutate: async ({ formId }: { formId: string }) => {
      await queryClient.cancelQueries({ queryKey: navigationFavoritesQueryKey });
      const previousFavorites = queryClient.getQueryData<FavoriteSummary[]>(
        navigationFavoritesQueryKey,
      );
      const optimisticFavoriteId = `${userId ?? "unknown"}:${formId}`;
      const existingFavorite = previousFavorites?.find((favorite) => favorite.formId === formId);

      queryClient.setQueryData<FavoriteSummary[]>(
        navigationFavoritesQueryKey,
        (currentFavorites) => {
          if (existingFavorite) {
            return (currentFavorites ?? []).filter((favorite) => favorite.formId !== formId);
          }

          return [
            ...(currentFavorites ?? []),
            {
              id: optimisticFavoriteId,
              userId: userId ?? "",
              formId,
              createdAt: new Date().toISOString(),
            },
          ];
        },
      );

      return { previousFavorites };
    },
    onError: async (_error, _variables, context) => {
      queryClient.setQueryData(navigationFavoritesQueryKey, context.previousFavorites ?? []);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: navigationFavoritesQueryKey });
    },
  });

export const getNavigationWorkspacesQueryOptions = () =>
  queryOptions({
    queryKey: navigationWorkspacesQueryKey,
    queryFn: async () => {
      const result = (await getWorkspaces()) as {
        workspaces: WorkspaceNavigationSummary[];
      };

      return result.workspaces;
    },
    staleTime: 1000 * 60 * 5,
  });

export const getNavigationFormsQueryOptions = (activeOrgId?: string) =>
  queryOptions({
    queryKey: navigationFormsQueryKey(activeOrgId),
    queryFn: async () => {
      if (!activeOrgId) {
        return [] as FormNavigationSummary[];
      }

      const result = (await getNavigationForms({
        data: { organizationId: activeOrgId },
      })) as { forms: FormNavigationSummary[] };

      return result.forms;
    },
    staleTime: 1000 * 60 * 5,
  });

export const getNavigationFavoritesQueryOptions = () =>
  queryOptions({
    queryKey: navigationFavoritesQueryKey,
    queryFn: async () => {
      const result = (await getFavorites()) as { favorites: FavoriteSummary[] };

      return result.favorites;
    },
    staleTime: 1000 * 60 * 5,
  });
