import { cn } from "@/lib/utils";
import { Toast as ToastPrimitive } from "@base-ui/react/toast";

export const toastManager = ToastPrimitive.createToastManager();

const Provider = (props: ToastPrimitive.Provider.Props) => (
  <ToastPrimitive.Provider toastManager={toastManager} timeout={5000} {...props} />
);

const Viewport = (props: ToastPrimitive.Viewport.Props) => {
  const { className, ...rest } = props;

  return (
    <ToastPrimitive.Viewport
      className={cn("fixed right-4 bottom-4 z-9999 flex w-fit flex-col items-end gap-4", className)}
      {...rest}
    />
  );
};

const Root = (props: ToastPrimitive.Root.Props) => {
  const { className, ...rest } = props;

  return (
    <ToastPrimitive.Root
      className={cn(
        "min-h-0 w-[320px] rounded-2xl bg-black px-4 py-3 shadow-[0_0_1px_0_rgba(0,0,0,0.19),0_1px_2px_0_rgba(0,0,0,0.07),0_6px_15px_-5px_rgba(0,0,0,0.11)]",
        className,
      )}
      {...rest}
    />
  );
};

const Title = (props: ToastPrimitive.Title.Props) => {
  const { className, ...rest } = props;

  return (
    <ToastPrimitive.Title className={cn("text-sm text-white not-italic", className)} {...rest} />
  );
};

const Description = (props: ToastPrimitive.Description.Props) => {
  const { className, ...rest } = props;

  return (
    <ToastPrimitive.Description
      className={cn("mt-[4px] text-muted-foreground not-italic", className)}
      {...rest}
    />
  );
};

const Close = (props: ToastPrimitive.Close.Props) => <ToastPrimitive.Close {...props} />;

const List = () => {
  const { toasts } = ToastPrimitive.useToastManager();

  return toasts.map((toast) => (
    <Root key={toast.id} toast={toast}>
      <div className="flex gap-2">
        {toast.data?.icon}
        <div>
          <Title />
          {toast.description && <Description />}
        </div>
      </div>
    </Root>
  ));
};

/**
 * Pre-composed toast setup for use in layout files (Server Components).
 * Renders Provider + Viewport + List as a single client component boundary.
 */
export const ToastSetup = () => (
  <Provider>
    <Viewport>
      <List />
    </Viewport>
  </Provider>
);

export const Toast = {
  Close,
  Description,
  List,
  Provider,
  Root,
  Title,
  Viewport,
};
