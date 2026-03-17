import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export const getContext = () => {
  const queryClient = new QueryClient();
  return {
    queryClient,
  };
};

const _Provider = ({
  children,
  queryClient,
}: {
  children: React.ReactNode;
  queryClient: QueryClient;
}) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
