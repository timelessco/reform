import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  buildNavigationSidebarData,
  createToggleFavoriteMutationOptions,
  getNavigationFavoritesQueryOptions,
  getNavigationFormsQueryOptions,
  getNavigationWorkspacesQueryOptions,
} from "@/lib/navigation-sidebar";

export const useNavigationSidebar = (activeOrgId?: string) => {
  const workspacesQuery = useQuery({
    ...getNavigationWorkspacesQueryOptions(),
    enabled: !!activeOrgId,
  });
  const formsQuery = useQuery({
    ...getNavigationFormsQueryOptions(activeOrgId),
    enabled: !!activeOrgId,
  });
  const favoritesQuery = useQuery({
    ...getNavigationFavoritesQueryOptions(),
    enabled: !!activeOrgId,
  });

  const data = useMemo(
    () =>
      buildNavigationSidebarData({
        activeOrgId,
        favorites: favoritesQuery.data ?? [],
        forms: formsQuery.data ?? [],
        workspaces: workspacesQuery.data ?? [],
      }),
    [activeOrgId, favoritesQuery.data, formsQuery.data, workspacesQuery.data],
  );

  return {
    data,
    isLoading: workspacesQuery.isLoading || formsQuery.isLoading || favoritesQuery.isLoading,
  };
};

export const useNavigationFavorites = () =>
  useQuery({
    ...getNavigationFavoritesQueryOptions(),
  });

export const useNavigationFavoriteState = (formId?: string) => {
  const { data } = useNavigationFavorites();

  return useMemo(() => {
    if (!formId) {
      return false;
    }

    return (data ?? []).some((favorite) => favorite.formId === formId);
  }, [data, formId]);
};

export const useToggleNavigationFavorite = (userId?: string) => {
  const queryClient = useQueryClient();

  return useMutation(createToggleFavoriteMutationOptions(queryClient, userId));
};
